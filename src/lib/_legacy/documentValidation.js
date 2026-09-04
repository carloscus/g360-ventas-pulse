export function validarDNI(dni) {
	const clean = dni.replace(/\D/g, '');
	if (clean.length !== 8) return false;
	return clean[0] !== '0';
}

export function validarRUC(ruc) {
	const clean = ruc.replace(/\D/g, '');
	if (clean.length !== 11) return false;

	const tipo = clean.substring(0, 2);
	if (!['10', '15', '17', '20'].includes(tipo)) return false;

	const suma = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((acc, mult, i) => {
		return acc + parseInt(clean[i]) * mult;
	}, 0);

	const resto = suma % 11;
	const digito = resto === 0 ? 0 : resto === 1 ? 1 : 11 - resto;

	return digito === parseInt(clean[10]);
}

export function validarDocumento(documento) {
	if (!documento) return { valid: false, type: null, message: 'Ingrese un documento' };

	const clean = documento.replace(/\D/g, '');

	if (clean.length === 8) {
		if (validarDNI(clean)) {
			return { valid: true, type: 'DNI', message: 'DNI válido' };
		}
		return { valid: false, type: 'DNI', message: 'DNI inválido (debe comenzar con número distinto de 0)' };
	}

	if (clean.length === 11) {
		if (validarRUC(clean)) {
			const tipo = clean.substring(0, 2);
			const tipoDesc = { '10': 'Persona Natural', '15': 'Persona Natural (Extranjero)', '17': 'Persona Natural (Extranjero)', '20': 'Persona Jurídica' };
			return { valid: true, type: 'RUC', message: `RUC válido — ${tipoDesc[tipo] || ''}` };
		}
		return { valid: false, type: 'RUC', message: 'RUC inválido (dígito verificador no coincide)' };
	}

	return { valid: false, type: null, message: 'Debe tener 8 dígitos (DNI) o 11 dígitos (RUC)' };
}
