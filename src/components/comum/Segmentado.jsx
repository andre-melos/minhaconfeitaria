// Grupo de botões de escolha única (filtros e modos de exibição), acessível por teclado e leitor de tela.
export default function Segmentado({ opcoes, valor, aoMudar, rotulo, colunas }) {
  return (
    <div role="group" aria-label={rotulo}
      className={`inline-grid gap-1 rounded-lg bg-gray-100 p-1 ${colunas ?? ''}`}
      style={colunas ? undefined : { gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, auto))` }}>
      {opcoes.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor} onClick={() => aoMudar(o.valor)}
          className={`min-h-[40px] rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-rose-600 ${valor === o.valor ? 'bg-white text-gray-900 shadow' : 'text-gray-700 hover:text-gray-900'}`}>
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
