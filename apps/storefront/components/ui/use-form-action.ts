"use client"

import { useActionState, useTransition, type FormEvent } from "react"

/**
 * `useActionState` for forms whose fields must keep what was typed.
 *
 * A form submitted through its `action` prop is reset by React when the action
 * finishes, so a validation error would wipe every field. Submitting from
 * `onSubmit` instead leaves the fields alone. The `action` prop is still set,
 * so the form works before the page's scripts have loaded.
 *
 *   const { state, action, onSubmit, pending } = useFormAction(save, initial)
 *   <form action={action} onSubmit={onSubmit}>
 */
export function useFormAction<State>(
  serverAction: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>
) {
  const [state, action, actionPending] = useActionState(serverAction, initialState)
  const [transitionPending, startTransition] = useTransition()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => action(formData))
  }

  return { state, action, onSubmit, pending: actionPending || transitionPending }
}
