# Zebra RFD8500 — integração em desenvolvimento

## Formato de coleta

O chip contém **16 dígitos decimais completos** (5 de sessão e 11 de identificação). O app não solicita sessão ao operar no modo Zebra.

```text
chip:     1234500000025219
registro: 850123450000002521919:09:24.309
```

Formato: `850` + `16 dígitos originais do chip` + `HH:MM:SS.mmm`. Total: **31 caracteres**. Exportação TXT usa as mesmas linhas de `logs`.

## Implementado nesta branch

- Modo Zebra na interface React sem substituir o modo manual.
- Formatação estrita e validação dos 16 dígitos.
- Recepção dos eventos `zebra-rfid-tag` (com `detail.chip`) e `zebra-rfid-status` (com `detail.status`) vindos de uma futura ponte Android.
- Testes de formato por `node --test tests/zebraRecord.test.js`.

## Ainda não implementado

- Aplicativo Android nativo/Capacitor e plugin Zebra RFID SDK, conexão Bluetooth, gatilho e inventário de tags.
- Decodificação de memória do chip: confirmar se os 16 dígitos vêm diretamente do EPC ou de memória USER. **Não** converter EPC hexadecimal arbitrariamente.
- O FTP de `src/App.jsx` está simulado no código original. É necessário substituir por transporte efetivo e confirmação de recebimento antes de alegar sincronização online.
- Persistência local durável e replay confiável após reinício.

## Contrato previsto para a ponte Android

Ao receber tag válida com 16 dígitos, o módulo nativo emitirá para a WebView:

```js
window.dispatchEvent(new CustomEvent('zebra-rfid-tag', {
  detail: { chip: '1234500000025219' }
}))
```

Notificações de conexão:
```js
window.dispatchEvent(new CustomEvent('zebra-rfid-status', {
  detail: { status: 'Conectado' }
}))
```

Os eventos são **contratos de integração**, não uma conexão Bluetooth existente. O módulo Android deve usar o SDK oficial da Zebra RFD8500 e cuidar do ciclo de vida do leitor. Requer validação física com o aparelho e chip real.

Documentação de referência: https://techdocs.zebra.com/dcs/rfid/android/2-0-5-292/guide/about/
