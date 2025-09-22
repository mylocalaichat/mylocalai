import './globals.css'

export const metadata = {
  title: 'MyLocalAI',
  description: 'Local AI powered by Ollama',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}