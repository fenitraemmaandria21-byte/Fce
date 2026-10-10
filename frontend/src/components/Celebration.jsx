import { useEffect, useState } from 'react'
import Confetti from 'react-confetti'

// Pluie de confettis (bleu + vert FCE) affichée une seule fois à la première connexion.
export default function Celebration({ duree = 5000 }) {
  const [taille, setTaille] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [actif, setActif] = useState(true)

  useEffect(() => {
    const surRedimension = () =>
      setTaille({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', surRedimension)
    const minuteur = setTimeout(() => setActif(false), duree)
    return () => {
      window.removeEventListener('resize', surRedimension)
      clearTimeout(minuteur)
    }
  }, [duree])

  if (!actif) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <Confetti
        width={taille.width}
        height={taille.height}
        numberOfPieces={350}
        gravity={0.25}
        colors={['#16a34a', '#22c55e', '#dcfce7', '#2563eb', '#3b82f6', '#bfdbfe']}
      />
    </div>
  )
}
