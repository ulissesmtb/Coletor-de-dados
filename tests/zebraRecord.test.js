import test from 'node:test'
import assert from 'node:assert/strict'
import { buildZebraRecord, isZebraRecord } from '../src/lib/zebraRecord.js'

test('RFD8500 mantém os 16 dígitos gravados no chip', () => {
  const d = new Date(2026, 9, 25, 19, 9, 24, 309)
  const line = buildZebraRecord('1234500000025219', d)
  assert.equal(line, '850123450000002521919:09:24.309')
  assert.equal(line.length, 31)
  assert.equal(isZebraRecord(line), true)
})

test('rejeita hexadecimal, comprimentos diferentes e caracteres extras', () => {
  for (const chip of ['ABCDEF0123456789', '12345', '12345000000252190', '123450000002521X']) {
    assert.throws(() => buildZebraRecord(chip), /16 dígitos/)
  }
})
