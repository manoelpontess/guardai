# 🛡 GuardAI — Câmera de Segurança & Babá Eletrônica

Aplicativo completo de câmera de segurança e babá eletrônica para **Android**, **iOS** e **Web**, desenvolvido com React Native + Expo.

---

## ✨ Funcionalidades

| Função | Descrição |
|--------|-----------|
| 📹 **Câmera ao vivo** | Feed em tempo real com overlay de informações |
| 👁 **Detecção de movimento** | Análise frame-a-frame com sensibilidade ajustável |
| 🎙 **Detecção de som** | Alerta quando o volume ultrapassa o limiar configurado |
| 👶 **Babá eletrônica** | IA detecta padrão de choro de bebê |
| 📡 **Multi-câmera** | Conecte vários dispositivos (Android, iPhone, computador) |
| 🔔 **Notificações push** | Alertas instantâneos mesmo com app em background |
| 🌙 **Visão noturna** | Ajuste automático em ambientes escuros |
| ⏺ **Gravação** | Salva clipes ao detectar eventos |
| ☁️ **Backup em nuvem** | Armazenamento automático de clipes |
| 🔊 **Áudio bidirecional** | Fale remotamente através do app |

---

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Expo CLI: `npm install -g expo-cli`
- Para iOS: macOS + Xcode 15+
- Para Android: Android Studio + SDK 34+

### Instalação

```bash
# 1. Clone / baixe o projeto
cd guardai

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npx expo start
```

Escaneie o QR code com o **Expo Go** (Android/iOS) ou pressione:
- `a` → Abrir no emulador Android
- `i` → Abrir no simulador iOS
- `w` → Abrir no navegador (Web)

---

## 📁 Estrutura do Projeto

```
guardai/
├── app/                        # Expo Router (navegação baseada em arquivos)
│   ├── _layout.tsx             # Root layout (SafeArea, StatusBar)
│   └── (tabs)/
│       ├── _layout.tsx         # Tab navigator com badge de alertas
│       ├── index.tsx           # → MonitorScreen (Ao vivo)
│       ├── cameras.tsx         # → CamerasScreen
│       ├── alerts.tsx          # → AlertsScreen
│       └── settings.tsx        # → SettingsScreen
│
├── src/
│   ├── screens/
│   │   ├── MonitorScreen.tsx   # Feed ao vivo + controles + métricas
│   │   ├── CamerasScreen.tsx   # Gerenciamento de câmeras
│   │   ├── AlertsScreen.tsx    # Histórico de alertas com filtros
│   │   └── SettingsScreen.tsx  # Todas as configurações
│   │
│   ├── components/
│   │   └── UIComponents.tsx    # GlowCard, MetricBar, ToggleRow, etc.
│   │
│   ├── hooks/
│   │   ├── useMotionDetection.ts  # Detecção de movimento por análise de frames
│   │   ├── useSoundDetection.ts   # Detecção de som + choro via expo-av
│   │   └── useNotifications.ts    # Push notifications via expo-notifications
│   │
│   ├── store/
│   │   └── appStore.ts         # Estado global com Zustand
│   │
│   └── utils/
│       ├── theme.ts            # Cores, fontes, espaçamento
│       ├── webrtc.ts           # Streaming P2P com WebRTC
│       ├── cryDetection.ts     # IA de detecção de choro (TF.js / heurística)
│       ├── backgroundTask.ts   # Monitoramento em background
│       └── storage.ts          # Persistência com AsyncStorage
│
├── app.json                    # Configuração do Expo
├── eas.json                    # Configuração de build EAS
└── package.json
```

---

## 🏗 Build para Produção

### Configurar EAS Build (uma vez só)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Android (APK / AAB)

```bash
# APK para testes
eas build --platform android --profile preview

# AAB para Google Play
eas build --platform android --profile production
```

### iOS (IPA)

```bash
# Simulador
eas build --platform ios --profile development

# App Store
eas build --platform ios --profile production
```

### Web (deploy estático)

```bash
npx expo export --platform web
# Pasta: dist/ → faça deploy no Netlify, Vercel, Firebase Hosting, etc.
```

---

## 🔧 Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| **React Native 0.74** | UI nativa Android/iOS |
| **Expo SDK 51** | APIs nativas (câmera, áudio, notificações) |
| **Expo Router** | Navegação file-based |
| **Zustand** | Gerenciamento de estado global |
| **expo-camera** | Acesso à câmera nativa |
| **expo-av** | Gravação e análise de áudio |
| **expo-notifications** | Push notifications nativas |
| **expo-background-fetch** | Monitoramento em background |
| **WebRTC** | Streaming P2P entre dispositivos |
| **TensorFlow.js / Lite** | IA para detecção de choro |
| **AsyncStorage** | Persistência local |

---

## 🧩 Como adicionar uma 2ª câmera

1. Instale o GuardAI no segundo dispositivo
2. Abra o app → aba **Câmeras** → **Adicionar câmera**
3. No segundo dispositivo, selecione **"Usar como câmera"**
4. Escaneie o QR code ou insira o código de pareamento
5. Os dois dispositivos se conectam via WebRTC (P2P)

---

## 🔒 Permissões necessárias

| Permissão | Android | iOS | Por quê |
|-----------|---------|-----|---------|
| `CAMERA` | ✅ | ✅ | Feed de vídeo |
| `RECORD_AUDIO` | ✅ | ✅ | Detecção de som/choro |
| `FOREGROUND_SERVICE` | ✅ | — | Monitoramento contínuo |
| `WAKE_LOCK` | ✅ | — | Manter tela ligada |
| `WRITE_EXTERNAL_STORAGE` | ✅ | ✅ | Salvar clipes de vídeo |
| `RECEIVE_BOOT_COMPLETED` | ✅ | — | Iniciar com o sistema |

---

## 🌐 Servidor de Sinalização WebRTC

Para streaming entre dispositivos em redes diferentes, você precisa de um servidor de sinalização. Exemplo simples com Node.js:

```bash
npm install ws
```

```js
// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const rooms = new Map();

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url.slice(1).split('?')[1]);
  const cameraId = params.get('cameraId');

  if (!rooms.has(cameraId)) rooms.set(cameraId, new Set());
  rooms.get(cameraId).add(ws);

  ws.on('message', (data) => {
    // Relay to all peers in the same room
    rooms.get(cameraId)?.forEach((peer) => {
      if (peer !== ws && peer.readyState === WebSocket.OPEN) {
        peer.send(data);
      }
    });
  });

  ws.on('close', () => rooms.get(cameraId)?.delete(ws));
});
```

Deploy gratuito: **Railway**, **Render**, **Fly.io**

---

## 📱 Screenshots

| Ao Vivo | Câmeras | Alertas | Config. |
|---------|---------|---------|---------|
| Feed + controles | Multi-câmera | Histórico filtrado | Todas as opções |

---

## 📄 Licença

MIT — livre para uso pessoal e comercial.
