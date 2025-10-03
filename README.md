# GoBridge Frontend

GoBridge Frontend is the user interface of the GoBridge protocol — a relay-free cross‑chain bridge powered by **Reactive Smart Contracts** and **goUSD** stablecoin.

## ✨ Features

- 🚀 **Bridge Interface** — Simple UI to move assets across supported chains  
- 💸 **goUSD Dashboard** — Manage balances, view value in USD, and track holdings  
- 📚 **Docs Integration** — Access protocol documentation directly in-app  
- 🔐 **Wallet Connect** — Seamless integration with RainbowKit and Wagmi  
- 🎨 **Modern UI/UX** — Tailored with responsive design, smooth transitions, and dark mode aesthetics  

## 🛠️ Tech Stack

- **Next.js 14** (App Router, React Server Components)  
- **TypeScript** for type‑safe development  
- **Tailwind CSS** for styling  
- **RainbowKit + Wagmi + Viem** for wallet and chain interactions  
- **Motion** for animations  

## 📂 Project Structure

```
/components       → Shared UI components (NavTabs, WalletButton, etc.)
/components/views → Page views (Bridge, goUSD, Docs)
/providers        → Global React context providers
/data             → Chain & token configs
/public           → Assets (logos, favicons, manifests)
```

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Run the dev server**
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Build

```bash
pnpm build
pnpm start
```

## 🌐 Deployment

The app is ready to deploy on any platform supporting Next.js apps: **Vercel**, **Netlify**, **Docker**, or custom servers.

## 📧 Contact

For **support & investment inquiries**:  
✉️ team@gobridge.xyz

---

© 2025 GoBridge. All rights reserved.
