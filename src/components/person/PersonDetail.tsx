import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, Cake, GraduationCap, Mail, MapPin, Pencil, Phone, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import type { Person } from '../../data/schema'
import { ageInYears, isoToDdmmyyyy } from '../../lib/dateOfBirth'
import { maskName } from '../../lib/nameMask'
import {
  canAddLinkedFamily,
  canAddRelationship,
  canEditPerson,
  type RelationKind,
} from '../../lib/permissions'
import { SignInGate } from '../layout/SignInGate'
import { LinkedFamilyToggle } from '../tree/LinkedFamilyToggle'
import { LinkedFamilyView } from '../tree/LinkedFamilyView'
import { AddPersonForm } from './AddPersonForm'
import { LinkFamilyRootForm } from './LinkFamilyRootForm'
import { PersonAvatar } from './PersonAvatar'
import { PersonCard } from './PersonCard'
import { PersonEditForm } from './PersonEditForm'
import { SocialLinks } from './SocialLinks'
import { StatusBadge } from './StatusBadge'

interface PersonDetailProps {
  person: Person
  parents: Person[]
  spouses: Person[]
  offspring: Person[]
  /** Full people array — needed to locate this person's linked-family branch, if any. */
  people: Person[]
  onSaved: () => void
}

/** Personal detail rows shown only once past the isLinkedMember gate below. */
const PRIVATE_FIELD_ROWS: Array<{ key: keyof Person; icon: typeof Phone; label: string }> = [
  { key: 'profession', icon: Briefcase, label: 'Profession' },
  { key: 'qualification', icon: GraduationCap, label: 'Qualification' },
  { key: 'location', icon: MapPin, label: 'Location' },
  { key: 'phone', icon: Phone, label: 'Phone' },
  { key: 'email', icon: Mail, label: 'Email' },
]

const RELATION_TITLE: Record<RelationKind, { singular: string; plural: string }> = {
  parent: { singular: 'Parent', plural: 'Parents' },
  spouse: { singular: 'Spouse', plural: 'Spouses' },
  child: { singular: 'Child', plural: 'Children' },
}

function AddRelationTile({ relation, onClick }: { relation: RelationKind; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-h-[10rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--glass-border)] p-5 text-center text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    >
      <UserPlus size={20} aria-hidden="true" />
      <span className="text-sm font-medium">Add {RELATION_TITLE[relation].singular}</span>
    </button>
  )
}

function RelationSection({
  relation,
  people,
  canAdd,
  onAdd,
  hideAddTile = false,
}: {
  relation: RelationKind
  people: Person[]
  canAdd: boolean
  onAdd: () => void
  /** True when this relation's "+ Add" tile is handled by a different entry point instead (e.g. parents of a married-in person route through "Link Another Family"). */
  hideAddTile?: boolean
}) {
  const { singular, plural } = RELATION_TITLE[relation]
  const effectiveCanAdd = canAdd && !hideAddTile
  if (people.length === 0 && !effectiveCanAdd) return null

  // Caps on how many of a relation this form offers to add at once — a
  // person has at most one recorded spouse and exactly two parents in
  // this UI's common flow (adding a third is an admin/edge case, not
  // something this self-service tile should invite).
  const atCap = (relation === 'spouse' && people.length >= 1) || (relation === 'parent' && people.length >= 2)
  const showAddTile = effectiveCanAdd && !atCap

  return (
    <div>
      <h3 className="mb-3 font-[var(--font-heading)] text-lg font-semibold text-[var(--color-foreground)]">
        {people.length > 1 ? plural : singular}
      </h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {people.map((p) => (
          <PersonCard key={p.nahar_id} person={p} />
        ))}
        {showAddTile && <AddRelationTile relation={relation} onClick={onAdd} />}
      </div>
    </div>
  )
}

export function PersonDetail({ person, parents, spouses, offspring, people, onSaved }: PersonDetailProps) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [addingRelation, setAddingRelation] = useState<RelationKind | null>(null)
  const [linkingFamily, setLinkingFamily] = useState(false)
  const [viewingLinkedFamily, setViewingLinkedFamily] = useState(false)
  const canEdit = canEditPerson(user, person)
  const isLinkedMember = !!user?.naharId
  const canLinkFamily = canAddLinkedFamily(user, person)

  const linkedFamilyRoot = useMemo(
    () => people.find((p) => p.linkedFamilyOf === person.nahar_id) ?? null,
    [people, person.nahar_id],
  )

  // A married-in person's own parents must form a linked branch, not plain
  // main-tree parents — so once they have no parents recorded yet, the
  // "Parent" section's own add-tile is hidden in favor of "Link Another
  // Family" below, which is what actually creates the right kind of record.
  const parentsRouteThroughLinkedFamily = !person.isBloodline && parents.length === 0

  function handleSaved() {
    setAddingRelation(null)
    setEditing(false)
    onSaved()
  }

  function handleLinkedFamilySaved(newRootId: string) {
    void newRootId
    setLinkingFamily(false)
    setViewingLinkedFamily(true)
    onSaved()
  }

  if (!isLinkedMember) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <PersonAvatar person={person} size="lg" masked />
          <p className="font-[var(--font-heading)] text-2xl font-bold text-[var(--color-foreground)]">
            {maskName(person.name)}
          </p>
        </div>
        <SignInGate
          title="Full profile for family members only"
          description="Sign in with the Google account linked to your family record to see this person's full details."
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col gap-10"
    >
      <AnimatePresence mode="wait">
        {editing ? (
          <PersonEditForm
            key="edit"
            person={person}
            onCancel={() => setEditing(false)}
            onSaved={handleSaved}
          />
        ) : addingRelation ? (
          <AddPersonForm
            key="add"
            anchor={person}
            anchorSpouses={spouses}
            relation={addingRelation}
            onCancel={() => setAddingRelation(null)}
            onSaved={handleSaved}
          />
        ) : linkingFamily ? (
          <LinkFamilyRootForm
            key="link-family"
            anchor={person}
            onCancel={() => setLinkingFamily(false)}
            onSaved={handleLinkedFamilySaved}
          />
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-strong relative flex flex-col items-center gap-4 rounded-3xl p-8 text-center sm:flex-row sm:items-start sm:p-10 sm:text-left"
          >
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="absolute top-5 right-5 flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
              >
                <Pencil size={12} aria-hidden="true" />
                Edit
              </button>
            )}
            <PersonAvatar person={person} size="lg" />
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <h1 className="font-[var(--font-heading)] text-3xl font-bold text-[var(--color-foreground)]">
                {person.name}
              </h1>
              <StatusBadge status={person.status} />
              <dl className="mt-2 flex flex-col gap-1.5">
                {person.dateOfBirth && (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                    <Cake size={14} aria-hidden="true" />
                    <dt className="sr-only">Date of Birth</dt>
                    <dd>
                      {isoToDdmmyyyy(person.dateOfBirth)}
                      {person.status === 'living' && ` (age ${ageInYears(person)})`}
                    </dd>
                  </div>
                )}
                {PRIVATE_FIELD_ROWS.map(({ key, icon: Icon, label }) => {
                  const value = person[key]
                  if (!value || typeof value !== 'string') return null
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]"
                    >
                      <Icon size={14} aria-hidden="true" />
                      <dt className="sr-only">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  )
                })}
              </dl>
              <SocialLinks person={person} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!editing && !addingRelation && !linkingFamily && (
        <>
          <RelationSection
            relation="parent"
            people={parents}
            canAdd={canAddRelationship(user, person, 'parent')}
            onAdd={() => setAddingRelation('parent')}
            hideAddTile={parentsRouteThroughLinkedFamily}
          />
          <RelationSection
            relation="spouse"
            people={spouses}
            canAdd={canAddRelationship(user, person, 'spouse')}
            onAdd={() => setAddingRelation('spouse')}
          />
          <RelationSection
            relation="child"
            people={offspring}
            canAdd={canAddRelationship(user, person, 'child')}
            onAdd={() => setAddingRelation('child')}
          />

          {(linkedFamilyRoot || canLinkFamily) && (
            <div className="flex flex-col items-center gap-3 border-t border-[var(--glass-border)] pt-8 text-center">
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {parentsRouteThroughLinkedFamily
                  ? `${person.name.split(' ')[0]} married into the Nahar family — their own parents and extended family live in a separate branch here, tucked away until opened.`
                  : `A separate lineage connected through ${person.name.split(' ')[0]}, tucked away until opened.`}
              </p>
              {linkedFamilyRoot ? (
                <LinkedFamilyToggle
                  label={linkedFamilyRoot.linkedFamilyLabel ?? `${person.name.split(' ')[0]}'s Family`}
                  onClick={() => setViewingLinkedFamily(true)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setLinkingFamily(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-[var(--glass-border)] px-4 py-2 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <UserPlus size={14} aria-hidden="true" />
                  {parentsRouteThroughLinkedFamily
                    ? `Add ${person.name.split(' ')[0]}'s Parents`
                    : 'Link Another Family'}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {viewingLinkedFamily && linkedFamilyRoot && (
        <LinkedFamilyView
          root={linkedFamilyRoot}
          anchor={person}
          people={people}
          onClose={() => setViewingLinkedFamily(false)}
        />
      )}
    </motion.div>
  )
}
