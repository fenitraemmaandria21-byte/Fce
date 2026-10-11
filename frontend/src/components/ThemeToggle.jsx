import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/context/ThemeContext'

const OPTIONS = [
  { valeur: 'light', libelle: 'Clair', icon: Sun },
  { valeur: 'dark', libelle: 'Sombre', icon: Moon },
  { valeur: 'system', libelle: 'Système', icon: Monitor },
]

export default function ThemeToggle({ className }) {
  const { theme, themeResolu, changerTheme } = useTheme()
  const Icone = themeResolu === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          title="Apparence"
          aria-label="Changer l’apparence"
        >
          <Icone />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Apparence</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.valeur}
            onClick={() => changerTheme(option.valeur)}
            className={theme === option.valeur ? 'bg-accent text-accent-foreground' : undefined}
          >
            <option.icon />
            {option.libelle}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
