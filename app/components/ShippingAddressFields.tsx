"use client";

import { DeliveryAddress } from "./account-store";

type ShippingAddressFieldsProps = {
  address: DeliveryAddress;
  onChange: (address: DeliveryAddress) => void;
  disabled?: boolean;
  required?: boolean;
};

const inputClass = "mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#5c2df2] disabled:bg-[#f3f0ee]";

export default function ShippingAddressFields({
  address,
  onChange,
  disabled = false,
  required = true,
}: ShippingAddressFieldsProps) {
  function update<K extends keyof DeliveryAddress>(key: K, value: DeliveryAddress[K]) {
    onChange({ ...address, [key]: value });
  }

  return (
    <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-3 text-sm font-semibold">Endereço de entrega</legend>
      <label className="block text-xs font-semibold sm:col-span-2">
        Nome de quem recebe
        <input autoComplete="name" required={required} value={address.recipient} onChange={(event) => update("recipient", event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold">
        CEP
        <input
          autoComplete="postal-code"
          required={required}
          inputMode="numeric"
          maxLength={9}
          pattern="[0-9]{5}-?[0-9]{3}"
          placeholder="00000-000"
          value={address.postalCode}
          onChange={(event) => update("postalCode", event.target.value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2"))}
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-semibold sm:col-span-2">
        Rua / avenida
        <input autoComplete="address-line1" required={required} value={address.street} onChange={(event) => update("street", event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold">
        Número
        <input required={required} value={address.number} onChange={(event) => update("number", event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold">
        Complemento (opcional)
        <input autoComplete="address-line2" value={address.complement} onChange={(event) => update("complement", event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold">
        Bairro
        <input autoComplete="address-level3" required={required} value={address.neighborhood} onChange={(event) => update("neighborhood", event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold">
        Cidade
        <input autoComplete="address-level2" required={required} value={address.city} onChange={(event) => update("city", event.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-semibold sm:col-span-2">
        Estado (UF)
        <input
          autoComplete="address-level1"
          required={required}
          minLength={2}
          maxLength={2}
          value={address.state}
          onChange={(event) => update("state", event.target.value.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase())}
          className={inputClass}
          placeholder="SP"
        />
      </label>
    </fieldset>
  );
}
