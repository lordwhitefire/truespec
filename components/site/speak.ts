// The reference `speak(html)` — the one in-view answer line (#speak).

export function speak(html: string) {
  const s = document.getElementById('speak');
  if (!s) return;
  s.innerHTML = html;
  s.classList.remove('pop');
  void (s as HTMLElement).offsetWidth;
  s.classList.add('pop');
}
