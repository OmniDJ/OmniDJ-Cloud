export const echo = console.log.bind(console);
export const echoFor = prefix => console.log.bind(console, prefix + " ->");
