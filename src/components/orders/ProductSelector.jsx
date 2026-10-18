
import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { categoriasNoFormatoAntigo } from '@/servicos/compatibilidadePrototipo';

export default function ProductSelector({ products, onAddItem }) {
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: dbCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriasNoFormatoAntigo()
  });

  const categories = useMemo(() => {
    if (dbCategories.length > 0) {
      return dbCategories.map(c => ({ id: c.id, name: c.name, emoji: c.emoji || '📦' }));
    }
    return [
      { id: 'bolo', name: 'Bolo', emoji: '🎂' },
      { id: 'docinho', name: 'Docinho', emoji: '🍬' },
      { id: 'outro', name: 'Outro', emoji: '✨' }
    ];
  }, [dbCategories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !productSearch || 
        p.name?.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearch, categoryFilter]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Adicionar Produtos</h2>
      
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar produto..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.emoji} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Produtos */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <Card
              key={product.id}
              className="p-3 cursor-pointer hover:shadow-md transition-shadow hover:bg-gray-50"
              onClick={() => onAddItem(product)}
            >
              <div className="font-medium text-sm truncate">{product.name}</div>
              <div className="text-sm text-gray-500">
                R$ {(product.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-2 text-center py-8 text-gray-500">
            Nenhum produto encontrado
          </div>
        )}
      </div>
    </div>
  );
}