import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Download, Send, Settings, Play, Pause, MessageCircle, Mail, X } from 'lucide-react'
import logo from './assets/logo.jpg'
import './App.css'
import { buildZebraRecord } from './lib/zebraRecord.js'

function App() {
  const [sessionId, setSessionId] = useState('')
  const [collectionMode, setCollectionMode] = useState('manual')
  const [zebraStatus, setZebraStatus] = useState('Aguardando integração Android')
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [logs, setLogs] = useState([])
  const [ftpStatus, setFtpStatus] = useState('Desconectado')
  const [showSendModal, setShowSendModal] = useState(false)
  const [showFtpModal, setShowFtpModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [ftpConfig, setFtpConfig] = useState({
    server: '',
    username: '',
    password: '',
    enabled: false
  })
  const inputRef = useRef(null)

  // Eventos enviados pela camada nativa Android (SDK Zebra).
  // Nenhuma conexão é simulada na versão web.
  useEffect(() => {
    const onTag = (event) => {
      if (collectionMode !== 'zebra' || !isSessionActive) return
      try {
        const record = buildZebraRecord(event.detail?.chip, new Date())
        setLogs(previous => [...previous, record])
      } catch (error) {
        setZebraStatus(`Leitura rejeitada: ${error.message}`)
      }
    }
    const onStatus = (event) => {
      setZebraStatus(String(event.detail?.status || 'Status indisponível'))
    }
    window.addEventListener('zebra-rfid-tag', onTag)
    window.addEventListener('zebra-rfid-status', onStatus)
    return () => {
      window.removeEventListener('zebra-rfid-tag', onTag)
      window.removeEventListener('zebra-rfid-status', onStatus)
    }
  }, [collectionMode, isSessionActive])

  const beginZebraSession = () => {
    setCollectionMode('zebra')
    setIsSessionActive(true)
    setLogs([])
  }

  const zebraCommand = (command) => {
    const api = window.ZebraNative
    if (!api || typeof api[command] !== 'function') {
      setZebraStatus('Conexão indisponível: abra o APK Android com SDK Zebra')
      return
    }
    api[command]()
  }

  // Função para formatar número com zeros à esquerda
  const formatNumber = (num, length) => {
    return num.toString().padStart(length, '0')
  }

  // Função para obter timestamp atual
  const getCurrentTimestamp = () => {
    const now = new Date()
    const hours = formatNumber(now.getHours(), 2)
    const minutes = formatNumber(now.getMinutes(), 2)
    const seconds = formatNumber(now.getSeconds(), 2)
    const milliseconds = formatNumber(now.getMilliseconds(), 3)
    return `${hours}:${minutes}:${seconds}.${milliseconds}`
  }

  // Função para iniciar sessão
  const startSession = () => {
    if (sessionId.length === 5) {
      setCollectionMode('manual')
      setIsSessionActive(true)
      setLogs([])
      // Focar no input de entrada de dados
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }
  }

  // Função para parar sessão
  const stopSession = () => {
    if (logs.length > 0) {
      setShowExitModal(true)
    } else {
      setIsSessionActive(false)
      setUserInput('')
    }
  }

  // Função para confirmar saída
  const confirmExit = () => {
    setIsSessionActive(false)
    setUserInput('')
    setShowExitModal(false)
  }

  // Função para salvar configurações FTP
  const saveFtpConfig = (config) => {
    setFtpConfig(config)
    setShowFtpModal(false)
    if (config.enabled) {
      setFtpStatus('Configurado')
    } else {
      setFtpStatus('Desconectado')
    }
  }

  // Função para adicionar entrada ao log
  const addLogEntry = () => {
    if (userInput && isSessionActive) {
      const formattedId = sessionId.padStart(5, '0')
      const formattedNumber = formatNumber(parseInt(userInput) || 0, 11)
      const timestamp = getCurrentTimestamp()
      const logEntry = `${formattedId}${formattedNumber}${timestamp}`
      
      setLogs(prev => [...prev, logEntry])
      setUserInput('')
      
      // Focar novamente no input
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  // Função para lidar com Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addLogEntry()
    }
  }

  // Função para exportar logs
  const exportLogs = () => {
    const logContent = logs.join('\n')
    const blob = new Blob([logContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `log_${collectionMode === 'zebra' ? '850' : sessionId}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Função para enviar via WhatsApp
  const sendViaWhatsApp = () => {
    const logContent = logs.join('\n')
    const message = `*Coletor Ponto de Controle - Corrida e Aventura*\n\nSessão: ${sessionId}\nData: ${new Date().toLocaleDateString()}\nTotal de entradas: ${logs.length}\n\n*Log de Entradas:*\n${logContent}`
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
    setShowSendModal(false)
  }

  // Função para enviar via email
  const sendViaEmail = () => {
    const logContent = logs.join('\n')
    const subject = `Log Coletor Ponto de Controle - Sessão ${sessionId}`
    const body = `Coletor Ponto de Controle - Corrida e Aventura\n\nSessão: ${sessionId}\nData: ${new Date().toLocaleDateString()}\nHora: ${new Date().toLocaleTimeString()}\nTotal de entradas: ${logs.length}\n\nLog de Entradas:\n${logContent}\n\n--\nGerado automaticamente pelo Coletor Ponto de Controle`
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
    setShowSendModal(false)
  }

  // Função para enviar para FTP
  const sendToFTP = async () => {
    if (!ftpConfig.enabled || !ftpConfig.server) {
      setFtpStatus('FTP não configurado')
      return
    }

    setFtpStatus('Enviando...')
    
    // Simular envio FTP (em produção, seria uma chamada para API backend)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setFtpStatus(`Enviado ${new Date().toLocaleTimeString()}`)
    } catch (error) {
      setFtpStatus('Erro no envio')
    }
  }

  // Envio automático FTP a cada minuto
  useEffect(() => {
    if (isSessionActive && logs.length > 0 && ftpConfig.enabled) {
      const interval = setInterval(() => {
        sendToFTP()
      }, 60000) // 1 minuto

      return () => clearInterval(interval)
    }
  }, [isSessionActive, logs, ftpConfig.enabled])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logo} 
                alt="Corrida e Aventura" 
                className="h-24 w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Coletor Ponto de Controle
            </CardTitle>
            <p className="text-gray-600">Corrida e Aventura</p>
          </CardHeader>
        </Card>

        {/* Seleção de coletor: mantém a entrada manual independente do Zebra */}
        {!isSessionActive && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardContent className="pt-6 flex flex-wrap gap-2">
              <Button type="button" variant={collectionMode === 'manual' ? 'default' : 'outline'} onClick={() => setCollectionMode('manual')}>Manual</Button>
              <Button type="button" variant={collectionMode === 'zebra' ? 'default' : 'outline'} onClick={() => setCollectionMode('zebra')}>Zebra RFD8500</Button>
            </CardContent>
          </Card>
        )}

        {/* Configuração de Sessão */}
        {!isSessionActive ? (
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {collectionMode === 'manual' ? 'Configurar Sessão' : 'Leitor Zebra RFD8500'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {collectionMode === 'manual' ? <div>
                <label className="block text-sm font-medium mb-2">
                  ID da Sessão (5 dígitos)
                </label>
                <Input
                  type="text"
                  maxLength={5}
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 01234"
                  className="text-center text-lg font-mono"
                />
              </div> : <p className="text-sm text-gray-600">Os 16 dígitos da sessão e do atleta já estão gravados no chip. Não é necessário informar a sessão. A conexão física depende do módulo Android Zebra.</p>}
              <Button
                onClick={collectionMode === 'manual' ? startSession : beginZebraSession}
                disabled={collectionMode === 'manual' && sessionId.length !== 5}
                className="w-full"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Sessão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Painel de Controle Ativo */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {collectionMode === 'manual' ? `Sessão Ativa: ${sessionId}` : 'Coleta Zebra RFD8500'}
                    </Badge>
                  </CardTitle>
                  <Button onClick={stopSession} variant="outline" size="sm">
                    <Pause className="h-4 w-4 mr-2" />
                    Parar Sessão
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {collectionMode === 'zebra' ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Leitor: {zebraStatus}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => zebraCommand('connect')}>Conectar</Button>
                      <Button type="button" variant="outline" onClick={() => zebraCommand('start')}>Iniciar leitura</Button>
                      <Button type="button" variant="outline" onClick={() => zebraCommand('stop')}>Parar leitura</Button>
                      <Button type="button" variant="outline" onClick={() => zebraCommand('disconnect')}>Desconectar</Button>
                    </div>
                    <p className="text-sm text-gray-600">Registro: 850 + 16 dígitos do chip + HH:MM:SS.mmm. Leituras só entram quando recebidas do módulo nativo Zebra.</p>
                  </div>
                ) : <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Número do Participante
                  </label>
                  <Input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite o número e pressione Enter"
                    className="text-center text-lg font-mono"
                    maxLength={11}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={addLogEntry} className="flex-1" disabled={!userInput}>
                    Registrar Entrada
                  </Button>
                </div>
                </>}
              </CardContent>
            </Card>

            {/* Status FTP */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status FTP:</span>
                    <Badge variant={ftpStatus.includes('Enviado') || ftpStatus === 'Configurado' ? 'default' : 'secondary'}>
                      {ftpStatus}
                    </Badge>
                  </div>
                  <Button 
                    onClick={() => setShowFtpModal(true)} 
                    variant="outline" 
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Log de Entradas */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Log de Entradas ({logs.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={exportLogs} variant="outline" size="sm" disabled={logs.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                    <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={logs.length === 0}>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Enviar Log de Entradas</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            Escolha como deseja enviar o log com {logs.length} entradas:
                          </p>
                          <div className="grid grid-cols-1 gap-3">
                            <Button 
                              onClick={sendViaWhatsApp}
                              className="flex items-center justify-center gap-2 h-12"
                              variant="outline"
                            >
                              <MessageCircle className="h-5 w-5 text-green-600" />
                              <span>Enviar via WhatsApp</span>
                            </Button>
                            <Button 
                              onClick={sendViaEmail}
                              className="flex items-center justify-center gap-2 h-12"
                              variant="outline"
                            >
                              <Mail className="h-5 w-5 text-blue-600" />
                              <span>Enviar via Email</span>
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Nenhuma entrada registrada ainda
                    </p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="font-mono text-sm bg-gray-50 p-2 rounded border">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Modal de Configuração FTP */}
        <Dialog open={showFtpModal} onOpenChange={setShowFtpModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Configurações FTP</DialogTitle>
            </DialogHeader>
            <FtpConfigForm 
              config={ftpConfig} 
              onSave={saveFtpConfig}
              onCancel={() => setShowFtpModal(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Saída */}
        <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Saída</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Você tem {logs.length} entradas registradas. Deseja enviar os dados antes de sair?
              </p>
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={() => setShowSendModal(true)}
                  className="flex items-center justify-center gap-2"
                  variant="default"
                >
                  <Send className="h-4 w-4" />
                  <span>Enviar e Sair</span>
                </Button>
                <Button 
                  onClick={confirmExit}
                  className="flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <X className="h-4 w-4" />
                  <span>Sair sem Enviar</span>
                </Button>
                <Button 
                  onClick={() => setShowExitModal(false)}
                  className="flex items-center justify-center gap-2"
                  variant="secondary"
                >
                  <span>Cancelar</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

// Componente para configuração FTP
function FtpConfigForm({ config, onSave, onCancel }) {
  const [formData, setFormData] = useState(config)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Servidor FTP
        </label>
        <Input
          type="text"
          value={formData.server}
          onChange={(e) => setFormData({...formData, server: e.target.value})}
          placeholder="ftp.exemplo.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          Usuário
        </label>
        <Input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          placeholder="usuario"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          Senha
        </label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          placeholder="senha"
        />
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="enabled"
          checked={formData.enabled}
          onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
          className="rounded border-gray-300"
        />
        <label htmlFor="enabled" className="text-sm font-medium">
          Habilitar envio automático FTP
        </label>
      </div>
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          Salvar
        </Button>
        <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
          Cancelar
        </Button>
      </div>
    </form>
  )
}

export default App
