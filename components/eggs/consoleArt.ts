export function printConsoleArt() {
  const art = `
%c
  ███╗   ██╗██╗ ██████╗██╗  ██╗
  ████╗  ██║██║██╔════╝██║ ██╔╝
  ██╔██╗ ██║██║██║     █████╔╝
  ██║╚██╗██║██║██║     ██╔═██╗
  ██║ ╚████║██║╚██████╗██║  ██╗
  ╚═╝  ╚═══╝╚═╝ ╚═════╝╚═╝  ╚═╝
%c
  oh hey, a fellow dev-tools opener.

  since you're here: press ~ for a surprise,
  and you probably know the konami code already.

  → github.com/Nicholas1811
`;
  console.log(
    art,
    "color:#ff4d00; font-weight:bold;",
    "color:inherit; font-family:monospace;"
  );
}
