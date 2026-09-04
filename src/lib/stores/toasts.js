import { writable } from 'svelte/store';

export const toasts = writable([]);

let counter = 0;

export function addToast(message, type = 'info', duration = 4000) {
	const id = ++counter;
	toasts.update(list => [...list, { id, message, type, duration }]);

	if (duration > 0) {
		setTimeout(() => removeToast(id), duration);
	}

	return id;
}

export function removeToast(id) {
	toasts.update(list => list.filter(t => t.id !== id));
}

export function success(message, duration) { return addToast(message, 'success', duration); }
export function error(message, duration) { return addToast(message, 'error', duration); }
export function warning(message, duration) { return addToast(message, 'warning', duration); }
