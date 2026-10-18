import { db } from '@/dados/legado';
import { Link } from 'react-router-dom';
import { massasNoFormatoAntigo, configuracoesDocesNoFormatoAntigo, produtosNoFormatoAntigo } from '@/servicos/compatibilidadePrototipo';

import React, { useState, useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";






import { Calculator, Search, Loader2, Cookie, Gift, Check } from 'lucide-react';

export default function DoughCalculator() {
  const queryClient = useQueryClient();
  
  // States para Calculadora
  const [calcMode, setCalcMode] = useState('manual'); // 'manual', 'orders', 'degustacao'
  const [manualQuantities, setManualQuantities] = useState({});
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // States para Caixa Degustação
  const [boxSize, setBoxSize] = useState('');
  const [boxCount, setBoxCount] = useState('1');
  const [selectedSweets, setSelectedSweets] = useState({}); // product_id -> true/false

  // Queries
  const { data: doughTypes = [], isLoading: loadingDoughs } = useQuery({
    queryKey: ['doughTypes'],
    queryFn: massasNoFormatoAntigo
  });

  const { data: sweetConfigs = [], isLoading: loadingSweets } = useQuery({
    queryKey: ['sweetConfigs'],
    queryFn: configuracoesDocesNoFormatoAntigo
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: produtosNoFormatoAntigo
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => db.entities.Order.list('-delivery_date')
  });

  // Cálculo das quantidades de doces a partir dos pedidos
  const orderQuantities = useMemo(() => {
    if (calcMode !== 'orders' || !startDate || !endDate) return {};
    
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const quantities = {};

    orders.forEach(order => {
      if (!order.delivery_date || order.status === 'cancelado') return;
      const orderDate = parseISO(order.delivery_date);
      if (!isWithinInterval(orderDate, { start, end })) return;

      (order.items || []).forEach(item => {
        const sweetConfig = sweetConfigs.find(s => s.product_id === item.product_id);
        if (sweetConfig) {
          if (!quantities[sweetConfig.product_id]) {
            quantities[sweetConfig.product_id] = 0;
          }
          quantities[sweetConfig.product_id] += item.quantity || 0;
        }
      });
    });

    return quantities;
  }, [orders, sweetConfigs, startDate, endDate, calcMode]);

  // Cálculo da Caixa Degustação
  const degustacaoQuantities = useMemo(() => {
    if (calcMode !== 'degustacao') return {};
    const size = parseInt(boxSize) || 0;
    if (size <= 0) return {};

    // Doces selecionados com configuração
    const chosen = sweetConfigs.filter(s => selectedSweets[s.product_id]);
    if (chosen.length === 0) return {};

    // Começa com 1 de cada sabor
    const qtys = {};
    chosen.forEach(s => { qtys[s.product_id] = 1; });

    const extraSlots = size - chosen.length;

    if (extraSlots > 0) {
      // Para cada doce candidato a repetição, calcula o "ganho" em gramas por receita
      // se adicionarmos +1 unidade — preferimos quem mais aproxima de receita inteira
      // Cada doce pode ser repetido no máximo 1 vez extra
      const candidates = [...chosen]; // todos elegíveis para +1

      // Algoritmo guloso: a cada slot extra, escolhe o doce que, ao ser adicionado,
      // faz o total de gramas de alguma massa chegar mais perto de múltiplo inteiro da receita
      const computeDoughGrams = (quantities) => {
        const grams = {}; // dough_id -> total grams
        chosen.forEach(s => {
          const q = quantities[s.product_id] || 0;
          const totalWeight = q * (s.unit_weight_grams || 0);
          (s.doughs || []).forEach(d => {
            if (!d.dough_id) return;
            grams[d.dough_id] = (grams[d.dough_id] || 0) + totalWeight * ((d.percentage || 0) / 100);
          });
        });
        return grams;
      };

      const fractionalWaste = (gramsMap) => {
        // Soma dos desperdícios fracionários de todas as massas (quanto sobra após múltiplo inteiro)
        let waste = 0;
        Object.keys(gramsMap).forEach(dId => {
          const dough = doughTypes.find(d => d.id === dId);
          const yield_ = dough?.recipe_yield_grams || 1;
          const frac = (gramsMap[dId] / yield_) % 1;
          // Desperdício = distância ao múltiplo mais próximo
          waste += Math.min(frac, 1 - frac);
        });
        return waste;
      };

      const usedExtra = new Set();

      for (let i = 0; i < extraSlots; i++) {
        const currentGrams = computeDoughGrams(qtys);
        const currentWaste = fractionalWaste(currentGrams);

        let bestCandidate = null;
        let bestWaste = Infinity;

        candidates.forEach(s => {
          if (usedExtra.has(s.product_id)) return;
          const testQtys = { ...qtys, [s.product_id]: (qtys[s.product_id] || 0) + 1 };
          const testGrams = computeDoughGrams(testQtys);
          const testWaste = fractionalWaste(testGrams);
          if (testWaste < bestWaste) {
            bestWaste = testWaste;
            bestCandidate = s;
          }
        });

        if (bestCandidate) {
          qtys[bestCandidate.product_id] = (qtys[bestCandidate.product_id] || 0) + 1;
          usedExtra.add(bestCandidate.product_id);
        } else {
          // Todos já repetiram uma vez — permite repetir mais (sem restrição)
          let bestAny = null;
          let bestAnyWaste = Infinity;
          candidates.forEach(s => {
            const testQtys = { ...qtys, [s.product_id]: (qtys[s.product_id] || 0) + 1 };
            const testGrams = computeDoughGrams(testQtys);
            const testWaste = fractionalWaste(testGrams);
            if (testWaste < bestAnyWaste) {
              bestAnyWaste = testWaste;
              bestAny = s;
            }
          });
          if (bestAny) {
            qtys[bestAny.product_id] = (qtys[bestAny.product_id] || 0) + 1;
          }
        }
      }
    }

    // Multiplicar pelo número de caixas
    const numBoxes = Math.max(1, parseInt(boxCount) || 1);
    const finalQtys = {};
    Object.keys(qtys).forEach(id => { finalQtys[id] = qtys[id] * numBoxes; });
    return finalQtys;
  }, [calcMode, boxSize, boxCount, selectedSweets, sweetConfigs, doughTypes]);

  // Usar quantidades manuais ou dos pedidos
  const activeQuantities = calcMode === 'manual' ? manualQuantities : calcMode === 'orders' ? orderQuantities : degustacaoQuantities;

  // Cálculo das receitas necessárias
  const recipeCalculation = useMemo(() => {
    const doughNeeds = {};

    sweetConfigs.forEach(sweet => {
      const qty = activeQuantities[sweet.product_id] || 0;
      if (qty <= 0) return;

      const totalWeight = qty * (sweet.unit_weight_grams || 0);

      (sweet.doughs || []).forEach(dough => {
        if (!dough.dough_id) return;
        const doughWeight = totalWeight * ((dough.percentage || 0) / 100);
        
        if (!doughNeeds[dough.dough_id]) {
          doughNeeds[dough.dough_id] = {
            name: dough.dough_name,
            totalGrams: 0,
            sweets: []
          };
        }
        doughNeeds[dough.dough_id].totalGrams += doughWeight;
        doughNeeds[dough.dough_id].sweets.push({
          name: sweet.product_name,
          qty,
          grams: doughWeight
        });
      });
    });

    // Calcular número de receitas com frações
    Object.keys(doughNeeds).forEach(doughId => {
      const dough = doughTypes.find(d => d.id === doughId);
      const yieldGrams = dough?.recipe_yield_grams || 1;
      const exactRecipes = doughNeeds[doughId].totalGrams / yieldGrams;
      
      // Arredondar para cima no múltiplo de 0.5 mais próximo (nunca produzir menos que o necessário)
      const suggestedRecipes = Math.ceil(exactRecipes * 2) / 2;
      
      doughNeeds[doughId].recipes = suggestedRecipes;
      doughNeeds[doughId].exactRecipes = exactRecipes;
      doughNeeds[doughId].yieldGrams = yieldGrams;
    });

    return doughNeeds;
  }, [sweetConfigs, doughTypes, activeQuantities]);

  if (loadingDoughs || loadingSweets) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calculadora de Massas</h1>
        <p className="text-gray-500">Calcule quantas receitas produzir para suas encomendas</p>
      </div>

      <p className="text-sm text-gray-600">
        Massas e composição dos doces são cadastradas em{' '}
        <Link to="/massas" className="text-rose-700 underline">Massas e doces</Link>.
      </p>
      <div className="space-y-6">

          <Card className="p-4">
            <div className="flex flex-wrap gap-3 mb-4">
              <Button
                variant={calcMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setCalcMode('manual')}
                className={calcMode === 'manual' ? 'bg-rose-500 hover:bg-rose-600' : ''}
              >
                Manual
              </Button>
              <Button
                variant={calcMode === 'orders' ? 'default' : 'outline'}
                onClick={() => setCalcMode('orders')}
                className={calcMode === 'orders' ? 'bg-rose-500 hover:bg-rose-600' : ''}
              >
                <Search className="w-4 h-4 mr-2" />
                Buscar nos Pedidos
              </Button>
              <Button
                variant={calcMode === 'degustacao' ? 'default' : 'outline'}
                onClick={() => setCalcMode('degustacao')}
                className={calcMode === 'degustacao' ? 'bg-rose-500 hover:bg-rose-600' : ''}
              >
                <Gift className="w-4 h-4 mr-2" />
                Caixa Degustação
              </Button>
            </div>

            {calcMode === 'orders' && (
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {calcMode === 'manual' && (
              <div className="space-y-3">
                <Label>Informe a quantidade de cada doce:</Label>
                {sweetConfigs.map(sweet => (
                  <div key={sweet.id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm">{sweet.product_name}</span>
                    <Input
                      type="number"
                      className="w-24"
                      min="0"
                      value={manualQuantities[sweet.product_id] || ''}
                      onChange={(e) => setManualQuantities({
                        ...manualQuantities,
                        [sweet.product_id]: parseInt(e.target.value) || 0
                      })}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}

            {calcMode === 'orders' && Object.keys(orderQuantities).length > 0 && (
              <div className="space-y-2 mt-4 p-3 bg-gray-50 rounded-lg">
                <Label className="text-gray-700">Doces encontrados nos pedidos:</Label>
                {sweetConfigs.filter(s => orderQuantities[s.product_id]).map(sweet => (
                  <div key={sweet.id} className="flex justify-between text-sm">
                    <span>{sweet.product_name}</span>
                    <span className="font-medium">{orderQuantities[sweet.product_id]} un.</span>
                  </div>
                ))}
              </div>
            )}

            {calcMode === 'degustacao' && (
              <div className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <Label>Tamanho da caixa (total de doces)</Label>
                    <Input
                      type="number"
                      min="1"
                      className="w-40 mt-1"
                      value={boxSize}
                      onChange={(e) => setBoxSize(e.target.value)}
                      placeholder="Ex: 25"
                    />
                  </div>
                  <div>
                    <Label>Quantidade de caixas</Label>
                    <Input
                      type="number"
                      min="1"
                      className="w-40 mt-1"
                      value={boxCount}
                      onChange={(e) => setBoxCount(e.target.value)}
                      placeholder="Ex: 10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Selecione os sabores da caixa:</Label>
                  {sweetConfigs.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum doce configurado.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {sweetConfigs.map(sweet => {
                        const isSelected = !!selectedSweets[sweet.product_id];
                        return (
                          <button
                            key={sweet.id}
                            type="button"
                            onClick={() => setSelectedSweets(prev => ({
                              ...prev,
                              [sweet.product_id]: !prev[sweet.product_id]
                            }))}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                              isSelected
                                ? 'bg-rose-50 border-rose-400 text-rose-800 font-medium'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-rose-300'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-rose-500 border-rose-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </span>
                            {sweet.product_name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Preview da distribuição */}
                {Object.keys(degustacaoQuantities).length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Composição para {boxCount || 1} caixa{parseInt(boxCount) !== 1 ? 's' : ''} de {boxSize} doces (total: {(parseInt(boxSize)||0) * (parseInt(boxCount)||1)} doces):
                    </p>
                    <div className="grid sm:grid-cols-2 gap-1">
                      {sweetConfigs
                        .filter(s => degustacaoQuantities[s.product_id])
                        .map(sweet => (
                          <div key={sweet.id} className="flex justify-between text-sm">
                            <span className="text-gray-700">{sweet.product_name}</span>
                            <span className={`font-semibold ${degustacaoQuantities[sweet.product_id] > 1 ? 'text-rose-600' : 'text-gray-800'}`}>
                              {degustacaoQuantities[sweet.product_id]} un.
                              {degustacaoQuantities[sweet.product_id] > 1 && ' ✕2'}
                            </span>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-amber-700 mt-2">
                      Total: {Object.values(degustacaoQuantities).reduce((a,b) => a+b, 0)} doces •
                      Sabores com ✕2 foram repetidos para otimizar as receitas de massa
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Resultado do Cálculo */}
          {Object.keys(recipeCalculation).length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-rose-500" />
                Receitas Necessárias
              </h3>
              <div className="space-y-4">
                {Object.entries(recipeCalculation).map(([doughId, data]) => (
                  <div key={doughId} className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 rounded-lg border border-rose-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900">{data.name}</span>
                      <span className="text-2xl font-bold text-rose-600">{data.recipes} receita(s)</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Total necessário: {data.totalGrams.toFixed(0)}g ({data.exactRecipes.toFixed(2)} receitas exatas)</p>
                      <p>Rendimento por receita: {data.yieldGrams}g</p>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {data.sweets.map((s, i) => (
                        <span key={i}>{s.name} ({s.qty}un = {s.grams.toFixed(0)}g){i < data.sweets.length - 1 ? ' • ' : ''}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {Object.keys(activeQuantities).length === 0 && (
            <Card className="p-8 text-center text-gray-500">
              <Cookie className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>
                {calcMode === 'manual'
                  ? 'Informe as quantidades dos doces acima'
                  : calcMode === 'orders'
                  ? 'Selecione um período com pedidos de doces configurados'
                  : 'Selecione o tamanho da caixa e os sabores acima'}
              </p>
            </Card>
          )}
        </div>


    </div>
  );
}