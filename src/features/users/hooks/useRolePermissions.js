import { useCallback, useEffect, useMemo, useState } from 'react'
import { listPermissionCatalogue, listRoles, updateRolePermissions } from '../api'

/**
 * Loads the permission matrix and holds the admin's pending edits.
 *
 * The matrix is a grid of checkboxes, so edits are kept locally and saved in
 * one action rather than firing a request per tick. That is not only cheaper —
 * it makes the change reviewable. Toggling six permissions and then deciding
 * against it should cost nothing, and a per-tick save would have applied all
 * six before the admin reconsidered.
 *
 * `draft` is a Map of roleId -> Set of permission keys. A Set because
 * membership is the only question ever asked of it, and per role because a
 * save targets one role's grants.
 *
 * Loading is derived from request identity rather than stored, matching
 * useIssues and useUsers: no setState in the effect body, and therefore no
 * cascading render on every fetch.
 */
export function useRolePermissions() {
  const [nonce, setNonce] = useState(0)
  const request = useMemo(() => ({ nonce }), [nonce])

  const [result, setResult] = useState({
    request: null,
    catalogue: [],
    roles: [],
    error: null,
  })

  const [draft, setDraft] = useState(() => new Map())
  const [savingRoleId, setSavingRoleId] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const isLoading = result.request !== request

  useEffect(() => {
    // Guards against an out-of-order response clobbering a newer one.
    let ignore = false

    Promise.all([listPermissionCatalogue(), listRoles()])
      .then(([catalogue, roles]) => {
        if (ignore) return
        setResult({ request, catalogue, roles, error: null })
        // The draft starts as a copy of what the server holds, so "dirty"
        // means "differs from saved" without needing a separate baseline.
        setDraft(new Map(roles.map((role) => [role.id, new Set(role.permissions)])))
      })
      .catch((error) => {
        if (ignore) return
        setResult({ request, catalogue: [], roles: [], error })
      })

    return () => {
      ignore = true
    }
  }, [request])

  const { catalogue, roles, error } = result

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  /** Flip one cell in the grid. Locked roles are ignored. */
  const toggle = useCallback(
    (roleId, permissionKey) => {
      const role = roles.find((candidate) => candidate.id === roleId)
      if (!role || role.isLocked) return

      setDraft((current) => {
        const next = new Map(current)
        const held = new Set(next.get(roleId) ?? [])
        if (held.has(permissionKey)) held.delete(permissionKey)
        else held.add(permissionKey)
        next.set(roleId, held)
        return next
      })
      setSaveError(null)
    },
    [roles],
  )

  /** Tick or clear a whole group for one role — the header checkbox. */
  const toggleGroup = useCallback(
    (roleId, permissionKeys, shouldHold) => {
      const role = roles.find((candidate) => candidate.id === roleId)
      if (!role || role.isLocked) return

      setDraft((current) => {
        const next = new Map(current)
        const held = new Set(next.get(roleId) ?? [])
        for (const key of permissionKeys) {
          if (shouldHold) held.add(key)
          else held.delete(key)
        }
        next.set(roleId, held)
        return next
      })
      setSaveError(null)
    },
    [roles],
  )

  /** Which roles have unsaved changes, so the UI can mark and gate them. */
  const dirtyRoleIds = useMemo(() => {
    const dirty = new Set()

    for (const role of roles) {
      const held = draft.get(role.id) ?? new Set()
      const saved = new Set(role.permissions)
      const changed =
        held.size !== saved.size || [...held].some((key) => !saved.has(key))
      if (changed) dirty.add(role.id)
    }

    return dirty
  }, [roles, draft])

  const isDirty = dirtyRoleIds.size > 0

  const holds = useCallback(
    (roleId, permissionKey) => Boolean(draft.get(roleId)?.has(permissionKey)),
    [draft],
  )

  const discard = useCallback(() => {
    setDraft(new Map(roles.map((role) => [role.id, new Set(role.permissions)])))
    setSaveError(null)
  }, [roles])

  /**
   * Persist one role's grants.
   *
   * Roles are saved individually because the API replaces grants per role —
   * PUT /api/roles/:id/permissions — and because a partial failure across
   * several roles would leave the matrix in a state the admin never chose.
   *
   * @returns {Promise<object>} The saved role.
   */
  const save = useCallback(
    async (roleId) => {
      setSavingRoleId(roleId)
      setSaveError(null)

      try {
        const permissions = [...(draft.get(roleId) ?? [])]
        const saved = await updateRolePermissions(roleId, permissions)

        // Replace the saved role in place rather than refetching everything:
        // the response is authoritative, and a refetch would discard an edit
        // in progress on a different role.
        setResult((current) => ({
          ...current,
          roles: current.roles.map((role) => (role.id === saved.id ? saved : role)),
        }))
        setDraft((current) => {
          const next = new Map(current)
          next.set(saved.id, new Set(saved.permissions))
          return next
        })

        return saved
      } catch (caught) {
        setSaveError(caught)
        throw caught
      } finally {
        setSavingRoleId(null)
      }
    },
    [draft],
  )

  return {
    catalogue,
    roles,
    isLoading,
    error,
    saveError,
    savingRoleId,
    dirtyRoleIds,
    isDirty,
    holds,
    toggle,
    toggleGroup,
    save,
    discard,
    refresh,
  }
}
