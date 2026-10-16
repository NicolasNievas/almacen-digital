/**
 * Aplica el tema antes del primer paint para evitar el flash (FOUC).
 * Respeta `localStorage.theme` y, si no hay valor, la preferencia del sistema.
 */
export default function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('theme');var d=t? t==='dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
