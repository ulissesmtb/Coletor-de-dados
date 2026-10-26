# Build Android — RFD8500 (experimental)

Esta pasta contém a primeira implementação nativa do **Zebra RFD8500** integrada à interface React via WebView.

## Dependências necessárias para montar e validar o APK

1. Android Studio / Android SDK API 35, JDK 17.
2. SDK oficial **Zebra RFID for Android** com seus arquivos AAR/JAR e eventuais dependências, obtidos diretamente da Zebra, e copiados para `android/app/libs/`. Não incluir binários do SDK no GitHub.
3. Android com Bluetooth e RFD8500 previamente pareado.
4. Gerar frontend na raiz com `pnpm install && pnpm build`, então copiar **o conteúdo** de `dist/` para `android/app/src/main/assets/www/`.
5. Abrir a pasta `android/` no Android Studio e compilar. Esta branch ainda não inclui Gradle Wrapper; a montagem do ambiente deve ser concluída no Android Studio.

## Contrato do chip

Exatamente 16 caracteres decimais gravados no chip: `1234500000025219`.

Registro produzido: `850123450000002521919:09:24.309` (31 caracteres).

**Ponto crítico**: os exemplos da Zebra devolvem o EPC no campo `getTagID()`, frequentemente hexadecimal. Nesta implementação, códigos que não sejam exatamente 16 caracteres decimais são **rejeitados**, não convertidos nem truncados. Antes da homologação, testar um chip real e confirmar se os 16 dígitos estão diretamente no EPC ou na área USER; se estiverem em USER, será necessário usar a leitura dessa área (TagAccess) no SDK.

## Condições e limitações

- Controles de Conectar/Iniciar/Parar/Desconectar em React; comunicação através de `window.ZebraNative`.
- A primeira versão seleciona o primeiro leitor pareado retornado pelo SDK; não há seletor de dispositivos.
- O gatilho físico ainda não foi associado ao inventário de leitura.
- Os timestamps são criados ao receber o evento no WebView, não no exato instante de detecção da antena.
- A fila de logs permanece em memória na implementação atual e pode se perder com encerramento do aplicativo.
- FTP continua simulado no projeto original; **não existe ainda sincronização online efetiva com confirmação**.
- O código nativo não foi compilado nem testado com o hardware; pode exigir ajustes conforme distribuição exata do SDK Zebra.

Documentação: https://techdocs.zebra.com/dcs/rfid/android/2-0-5-292/guide/connection/

Não implantar em prova sem testes reais e sem persistência e sincronização confiáveis.
