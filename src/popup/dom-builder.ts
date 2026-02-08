interface ElementOptions {
  readonly className?: string;
  readonly id?: string;
  readonly textContent?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly children?: readonly (HTMLElement | string)[];
  readonly onclick?: (e: Event) => void;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }
  if (options.id) {
    element.id = options.id;
  }
  if (options.textContent) {
    element.textContent = options.textContent;
  }
  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, value);
    }
  }
  if (options.onclick) {
    element.addEventListener("click", options.onclick);
  }
  if (options.children) {
    for (const child of options.children) {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    }
  }

  return element;
}

export function clearChildren(parent: Element): void {
  parent.replaceChildren();
}
