/* Ayudas compartidas por las plantillas. Todo se pinta con textContent. */

const el = (etiqueta, clase, texto) => {
  const n = document.createElement(etiqueta);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
};

/* "hice un *bot* que" → la palabra entre asteriscos va en grafiti. Los \n parten líneas. */
function titulo(nodo, texto) {
  nodo.replaceChildren();
  String(texto).split("\n").forEach((linea, i) => {
    if (i) nodo.append(document.createElement("br"));
    linea.split(/(\*[^*]+\*)/).forEach((trozo) => {
      if (!trozo) return;
      if (trozo.startsWith("*")) nodo.append(el("span", "grafiti", trozo.slice(1, -1)));
      else nodo.append(document.createTextNode(trozo));
    });
  });
  return nodo;
}

/* Resaltado mínimo para JS/Python. */
const CLAVES = /^(const|let|var|function|return|if|else|for|while|of|in|import|from|export|default|async|await|new|class|def|try|catch|throw|true|false|null)$/;
function lineaCodigo(texto) {
  const f = document.createDocumentFragment();
  const re = /(\/\/.*$|#.*$|\/\*.*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+\b|\b[A-Za-z_]\w*\b)/g;
  let ultimo = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) f.append(document.createTextNode(texto.slice(ultimo, m.index)));
    const t = m[0];
    let c = null;
    if (/^(\/\/|#|\/\*)/.test(t)) c = "tk-com";
    else if (/^["'`]/.test(t)) c = "tk-str";
    else if (/^\d/.test(t)) c = "tk-num";
    else if (CLAVES.test(t)) c = "tk-key";
    f.append(c ? el("span", c, t) : document.createTextNode(t));
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) f.append(document.createTextNode(texto.slice(ultimo)));
  return f;
}

function marca(clase = "marca") {
  const n = el("span", clase, "juanchito.dev");
  n.append(el("span", "cursor", "_"));
  return n;
}
