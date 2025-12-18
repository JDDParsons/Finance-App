import { prisma } from '../api/prisma'
import { v4 as uuidv4 } from 'uuid'

export type BalanceInput = {
  bmoChequing1?: number | string | null
  bmoChequing2?: number | string | null
  bmoMastercard?: number | string | null
  questradeTfsa?: number | string | null
  questradeRrsp?: number | string | null
  questradeLrsp?: number | string | null
  questradeFhsa?: number | string | null
  scotiabankChequing?: number | string | null
  scotiabankSavings?: number | string | null
  scotiabankVisa?: number | string | null
  pcMastercard?: number | string | null
  total: number | string | null
}

export class FormService {
  /**
   * Save a balance snapshot to the Balance table.
   * Accepts numbers or strings; Prisma accepts string|number for Decimal fields.
   */
  async saveBalance(input: BalanceInput) {
    const id = uuidv4()

    const payload = {
      id,
      bmo_chequing_1: input.bmoChequing1 ?? null,
      bmo_chequing_2: input.bmoChequing2 ?? null,
      bmo_mastercard: input.bmoMastercard ?? null,
      questrade_tfsa: input.questradeTfsa ?? null,
      questrade_rrsp: input.questradeRrsp ?? null,
      questrade_lrsp: input.questradeLrsp ?? null,
      questrade_fhsa: input.questradeFhsa ?? null,
      scotiabank_chequing: input.scotiabankChequing ?? null,
      scotiabank_savings: input.scotiabankSavings ?? null,
      scotiabank_visa: input.scotiabankVisa ?? null,
      pcfinancial_mastercard: input.pcMastercard ?? null,
      total: input.total ?? null
    }

    const created = await prisma.balance.create({ data: payload as any })
    return created
  }
}
