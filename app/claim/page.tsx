import { ClaimForm } from "./claim-form"

export default function ClaimPage() {
  return (
    <ClaimForm
      sinpePhoneNumber={process.env.SINPE_PHONE_NUMBER}
      whatsappPhoneNumber={process.env.WHATSAPP_PHONE_NUMBER}
    />
  )
}
