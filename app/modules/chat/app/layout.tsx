import '../App.css'

export const metadata = {
  title: 'MyLocalAI Chat',
  description: 'AI Chat Interface powered by Ollama',
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