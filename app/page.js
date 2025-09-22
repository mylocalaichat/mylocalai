import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="module-container">
      <h1>MyLocalAI - Module Directory</h1>
      <div className="module-nav">
        <Link href="/modules/chat">Chat Interface</Link>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <h2>Available Modules:</h2>
        <ul style={{ listStyle: 'disc', marginLeft: '2rem', marginTop: '1rem' }}>
          <li><strong>Chat:</strong> AI chat interface powered by Ollama</li>
        </ul>
        <p style={{ marginTop: '1rem', opacity: 0.8 }}>
          Each module can be accessed independently and served as a standalone application.
        </p>
      </div>
    </div>
  )
}