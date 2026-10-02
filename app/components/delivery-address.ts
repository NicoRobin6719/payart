import { DeliveryAddress } from "./account-store";

export function isCompleteDeliveryAddress(address: DeliveryAddress) {
  return Boolean(
    address.recipient.trim()
    && address.postalCode.replace(/\D/g, "").length === 8
    && address.street.trim()
    && address.number.trim()
    && address.neighborhood.trim()
    && address.city.trim()
    && address.state.trim().length === 2,
  );
}
