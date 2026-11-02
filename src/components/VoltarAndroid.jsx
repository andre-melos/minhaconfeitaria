// Gesto/botão "voltar" do Android: fecha janelas abertas, volta à tela anterior e,
// na tela inicial, apenas minimiza o app (sem fechá-lo).
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as AppNativo } from '@capacitor/app';

const TELA_INICIAL = '/agenda';

export default function VoltarAndroid() {
  const navigate = useNavigate();
  const location = useLocation();
  const caminho = useRef(location.pathname);
  caminho.current = location.pathname;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const ouvinte = AppNativo.addListener('backButton', ({ canGoBack }) => {
      // 1) Se há uma janela (diálogo, menu, lista de opções) aberta, fecha só ela.
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }
      // 2) Volta para a tela anterior.
      if (canGoBack && window.history.state?.idx > 0) {
        navigate(-1);
        return;
      }
      // 3) Sem histórico: vai para a Agenda; se já está nela, minimiza o app.
      if (caminho.current !== TELA_INICIAL) navigate(TELA_INICIAL, { replace: true });
      else AppNativo.minimizeApp();
    });
    return () => { ouvinte.then((o) => o.remove()); };
  }, [navigate]);

  return null;
}
