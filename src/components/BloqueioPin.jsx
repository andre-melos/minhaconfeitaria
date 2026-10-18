// UC20 – Desbloquear Aplicativo: pede o PIN ao abrir e após 5 minutos em segundo plano.
import { useEffect, useRef, useState } from 'react';
import { Cake, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { configuracaoServico } from '@/servicos/configuracaoServico';

const TEMPO_SEGUNDO_PLANO_MS = 5 * 60 * 1000;
const MAX_TENTATIVAS = 5;
const ESPERA_SEGUNDOS = 30;

function Moldura({ titulo, subtitulo, children }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-rose-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto bg-rose-600 rounded-2xl flex items-center justify-center">
            <Cake className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
          <p className="text-gray-600">{subtitulo}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

const campoPin = (props) => (
  <Input type="password" inputMode="numeric" autoComplete="off" maxLength={6} pattern="\d*"
    className="h-12 text-center text-2xl tracking-[0.5em]" {...props} />
);

function CriarPin({ aoCriar }) {
  const [pin, setPin] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await configuracaoServico.definirPin(pin, confirmacao);
      aoCriar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Moldura titulo="Bem-vinda(o)!" subtitulo="Crie um PIN de 4 a 6 números para proteger seus dados.">
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <Label htmlFor="novo-pin">PIN</Label>
          {campoPin({ id: 'novo-pin', value: pin, onChange: (e) => setPin(e.target.value.replace(/\D/g, '')), required: true, autoFocus: true })}
        </div>
        <div>
          <Label htmlFor="confirmar-pin">Confirme o PIN</Label>
          {campoPin({ id: 'confirmar-pin', value: confirmacao, onChange: (e) => setConfirmacao(e.target.value.replace(/\D/g, '')), required: true })}
        </div>
        {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
        <Button type="submit" className="w-full h-12 bg-rose-600 hover:bg-rose-700" disabled={salvando}>
          {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Criar PIN
        </Button>
      </form>
    </Moldura>
  );
}

function Desbloquear({ aoDesbloquear }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [tentativas, setTentativas] = useState(0);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const timer = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [espera]);

  const enviar = async (e) => {
    e.preventDefault();
    if (espera > 0) return;
    if (await configuracaoServico.verificarPin(pin)) {
      aoDesbloquear();
      return;
    }
    const total = tentativas + 1;
    setPin('');
    if (total >= MAX_TENTATIVAS) {
      setTentativas(0);
      setEspera(ESPERA_SEGUNDOS);
      setErro(`Muitas tentativas. Aguarde ${ESPERA_SEGUNDOS} segundos.`);
    } else {
      setTentativas(total);
      setErro(`PIN incorreto. Restam ${MAX_TENTATIVAS - total} tentativa(s).`);
    }
  };

  return (
    <Moldura titulo="MinhaConfeitaria" subtitulo="Digite seu PIN para continuar.">
      <form onSubmit={enviar} className="space-y-4">
        <Label htmlFor="pin" className="sr-only">PIN</Label>
        {campoPin({ id: 'pin', value: pin, onChange: (e) => setPin(e.target.value.replace(/\D/g, '')), autoFocus: true, disabled: espera > 0 })}
        {erro && <p role="alert" className="text-sm text-red-700 text-center">{espera > 0 ? `Aguarde ${espera} s.` : erro}</p>}
        <Button type="submit" className="w-full h-12 bg-rose-600 hover:bg-rose-700" disabled={espera > 0 || pin.length < 4}>
          <Lock className="w-4 h-4 mr-2" aria-hidden="true" /> Desbloquear
        </Button>
        <p className="text-xs text-gray-500 text-center">
          Esqueceu o PIN? Só é possível redefini-lo importando um backup, o que substitui os dados atuais.
        </p>
      </form>
    </Moldura>
  );
}

export default function BloqueioPin({ children }) {
  const [estado, setEstado] = useState('carregando'); // carregando | criar | bloqueado | liberado
  const ocultoDesde = useRef(null);

  useEffect(() => {
    configuracaoServico.obter().then((c) => setEstado(c.tem_pin ? 'bloqueado' : 'criar'));
  }, []);

  useEffect(() => {
    const aoMudarVisibilidade = () => {
      if (document.hidden) {
        ocultoDesde.current = Date.now();
      } else if (ocultoDesde.current && Date.now() - ocultoDesde.current >= TEMPO_SEGUNDO_PLANO_MS) {
        setEstado((atual) => (atual === 'liberado' ? 'bloqueado' : atual));
      }
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  }, []);

  if (estado === 'carregando') return null;
  if (estado === 'criar') return <CriarPin aoCriar={() => setEstado('liberado')} />;
  if (estado === 'bloqueado') return <Desbloquear aoDesbloquear={() => setEstado('liberado')} />;
  return children;
}
