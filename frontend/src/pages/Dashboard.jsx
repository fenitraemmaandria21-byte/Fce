import { useCallback, useEffect, useState } from 'react'
import {
  Banknote,
  Coins,
  Package,
  PackageCheck,
  RefreshCw,
  Scale,
  Ticket,
  Truck,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useApi } from '@/hooks/useApi'
import { LIBELLES_CLASSE, formatArgent, formatNombre } from '@/lib/affichage'
import Statistiques from '@/pages/Statistiques'
import api, { messageApi } from '@/services/api'

const nf = new Intl.NumberFormat('fr-FR')

const COULEURS = {
  fce: '#16a34a',
  fceClair: '#4ade80',
  bleu: '#3b82f6',
  bleuClair: '#60a5fa',
}

const COULEURS_CLASSES = [COULEURS.fce, COULEURS.bleu, COULEURS.fceClair]

function CarteIndicateur({ titre, valeur, format = 'nombre', icone: Icone }) {
  const affiche =
    format === 'argent' ? `${nf.format(valeur)} Ar` : nf.format(valeur)
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {titre}
          </CardTitle>
          {Icone && (
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-fce-100 text-fce-700">
              <Icone className="size-4" />
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{affiche}</p>
      </CardContent>
    </Card>
  )
}

function dateCourte(valeur) {
  const d = new Date(`${valeur}T00:00:00`)
  if (Number.isNaN(d.getTime())) return valeur
  return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d)
}

function BlocChargement() {
  return <Skeleton className="h-64" />
}

function MessageVide({ message = 'Aucune donnée pour la période.' }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function CarteRecettes({ donnees, chargement, erreur }) {
  const lignes = donnees?.parMois?.donnees || []
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recettes par mois</CardTitle>
        <p className="text-sm text-muted-foreground">
          Billetterie (vert) et locations (bleu) — cette année.
        </p>
      </CardHeader>
      <CardContent>
        {chargement ? (
          <BlocChargement />
        ) : erreur ? (
          <MessageVide message="Données indisponibles." />
        ) : lignes.length === 0 ? (
          <MessageVide />
        ) : (
          <ResponsiveContainer width="100%" height={264}>
            <BarChart data={lignes} barGap={4}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="mois"
                tickFormatter={dateCourte}
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => nf.format(v)}
                tick={{ fontSize: 12 }}
                stroke="#94a3b8"
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                formatter={(valeur, nom) => [formatArgent(Number(valeur)), nom === 'billets' ? 'Billetterie' : 'Locations']}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Legend />
              <Bar dataKey="billets" name="Billetterie" fill={COULEURS.fce} radius={[4, 4, 0, 0]} />
              <Bar dataKey="locations" name="Locations" fill={COULEURS.bleu} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function CarteBilletsParClasse({ donnees, chargement, erreur }) {
  const total = donnees?.total?.nombre ?? 0
  const lignes = (donnees?.parClasse?.donnees || []).map((l) => ({
    nom: LIBELLES_CLASSE[l.classe] || l.classe,
    valeur: l.nombre,
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Billets vendus par classe</CardTitle>
        <p className="text-sm text-muted-foreground">
          Répartition des ventes — cette année.
        </p>
      </CardHeader>
      <CardContent>
        {chargement ? (
          <BlocChargement />
        ) : erreur ? (
          <MessageVide message="Données indisponibles." />
        ) : lignes.length === 0 ? (
          <MessageVide />
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={lignes}
                  dataKey="valeur"
                  nameKey="nom"
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={2}
                >
                  {lignes.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COULEURS_CLASSES[index % COULEURS_CLASSES.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatNombre(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums">
                {formatNombre(total)}
              </span>
              <span className="text-xs text-muted-foreground">billets</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [essai, setEssai] = useState(0)

  const [etat, setEtat] = useState({ statut: 'chargement' })

  const recettes = useApi('/statistiques/recettes', { periode: 'annee', _essai: essai })
  const billetterie = useApi('/statistiques/billetterie', { periode: 'annee', _essai: essai })

  const charger = useCallback(() => {
    api
      .get('/dashboard')
      .then((r) => setEtat({ statut: 'ok', donnees: r.data }))
      .catch((e) => setEtat({ statut: 'erreur', erreur: e }))
  }, [])

  useEffect(() => {
    charger()
  }, [charger, essai])

  const recharger = () => {
    setEtat({ statut: 'chargement' })
    setEssai((n) => n + 1)
  }

  const entete = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <Button
        variant="outline"
        size="sm"
        onClick={recharger}
        disabled={etat.statut === 'chargement'}
      >
        <RefreshCw className={etat.statut === 'chargement' ? 'animate-spin' : undefined} />
        Actualiser
      </Button>
    </div>
  )

  let contenu
  if (etat.statut === 'chargement') {
    contenu = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  } else if (etat.statut === 'erreur') {
    contenu = (
      <Alert variant="destructive">
        <AlertTitle>Données indisponibles</AlertTitle>
        <AlertDescription>
          {messageApi(etat.erreur, 'Impossible de charger le tableau de bord.')}{' '}
          Vérifiez que PostgreSQL est démarré (docker compose up -d) puis
          appliquez les migrations.
        </AlertDescription>
      </Alert>
    )
  } else {
    const { indicateurs } = etat.donnees
    contenu = (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CarteIndicateur
            titre="Billets vendus"
            valeur={indicateurs.billetsVendus}
            icone={Ticket}
          />
          <CarteIndicateur
            titre="Recette billetterie"
            valeur={indicateurs.recetteBillets}
            format="argent"
            icone={Banknote}
          />
          <CarteIndicateur
            titre="Envois de marchandises"
            valeur={indicateurs.nombreEnvois}
            icone={Package}
          />
          <CarteIndicateur
            titre="Poids expédié (kg)"
            valeur={indicateurs.poidsTotalKg}
            icone={Scale}
          />
          <CarteIndicateur
            titre="Arrivages"
            valeur={indicateurs.nombreArrivages}
            icone={PackageCheck}
          />
          <CarteIndicateur
            titre="Locations"
            valeur={indicateurs.nombreLocations}
            icone={Truck}
          />
          <CarteIndicateur
            titre="Recette locations"
            valeur={indicateurs.recetteLocations}
            format="argent"
            icone={Coins}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <CarteRecettes
            donnees={recettes.donnees}
            chargement={recettes.chargement}
            erreur={recettes.erreur}
          />
          <CarteBilletsParClasse
            donnees={billetterie.donnees}
            chargement={billetterie.chargement}
            erreur={billetterie.erreur}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {entete}

      <Tabs defaultValue="apercu" className="space-y-6">
        <TabsList>
          <TabsTrigger value="apercu">Aperçu</TabsTrigger>
          <TabsTrigger value="statistiques">Statistiques</TabsTrigger>
        </TabsList>
        <TabsContent value="apercu" className="space-y-6">
          {contenu}
        </TabsContent>
        <TabsContent value="statistiques">
          <Statistiques sansTitre />
        </TabsContent>
      </Tabs>
    </div>
  )
}