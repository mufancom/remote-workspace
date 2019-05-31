const INDENT_TAB_SIZE = 2;

export function indent(
  text: string,
  depth: number,
  tabSize = INDENT_TAB_SIZE,
): string {
  let whitespaces = ' '.repeat(tabSize * depth);
  return text.replace(/^/gm, whitespaces);
}
