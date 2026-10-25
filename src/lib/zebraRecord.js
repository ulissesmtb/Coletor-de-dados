// Contrato de registro do coletor Zebra RFD8500.
// O chip contém os 16 dígitos completos: 5 de sessão + 11 de atleta.
export const ZEBRA_PREFIX = '850'

export function buildZebraRecord(chipValue, date = new Date()) {
  const chip = String(chipValue ?? '').trim()
  if (!/^\d{16}$/.test(chip)) {
    throw new Error('O chip deve conter exatamente 16 dígitos decimais.')
  }
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error('Horário de leitura inválido.')
  }
  const pad = (value, width) => String(value).padStart(width, '0')
  const time = [
    pad(date.getHours(), 2),
    pad(date.getMinutes(), 2),
    pad(date.getSeconds(), 2),
  ].join(':') + '.' + pad(date.getMilliseconds(), 3)
  return `${ZEBRA_PREFIX}${chip}${time}`
}

export function isZebraRecord(value) {
  return /^850\d{16}\d{2}:\d{2}:\d{2}\.\d{3}$/.test(String(value))
}
