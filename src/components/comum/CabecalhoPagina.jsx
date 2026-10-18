export default function CabecalhoPagina({ titulo, subtitulo, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>
        {subtitulo && <p className="text-gray-600">{subtitulo}</p>}
      </div>
      {children}
    </div>
  );
}
