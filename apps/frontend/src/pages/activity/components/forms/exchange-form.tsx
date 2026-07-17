import { useMemo } from "react";
import { isLiabilityAccountType, QuoteMode } from "@/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@wealthfolio/ui/components/ui/button";
import { Icons } from "@wealthfolio/ui/components/ui/icons";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import type { TFunction } from "i18next";
import {
  AccountSelect,
  AmountInput,
  createValidatedSubmit,
  DatePicker,
  FormSection,
  NotesInput,
  QuantityInput,
  SymbolSearch,
  type AccountSelectOption,
} from "./fields";

// Translated message helper (see buy-form for rationale).
type MsgFn = TFunction | undefined;
const msg = (t: MsgFn, key: string, en: string) => (t ? t(key) : en);

const assetMetadataSchema = z
  .object({
    name: z.string().nullable().optional(),
    kind: z.string().nullable().optional(),
    exchangeMic: z.string().nullable().optional(),
    providerId: z.string().nullable().optional(),
    providerSymbol: z.string().nullable().optional(),
  })
  .optional();

// Zod schema factory for ExchangeForm validation. `t` optional so the exported
// static schema keeps English messages (used by tests and type inference).
export const createExchangeFormSchema = (t?: TFunction) =>
  z.object({
    accountId: z.string().min(1, {
      message: msg(t, "activity:form.err_select_account", "Please select an account."),
    }),
    activityDate: z.date({
      required_error: msg(t, "activity:form.err_select_date", "Please select a date."),
    }),
    fromAssetId: z.string().min(1, {
      message: msg(t, "activity:form.err_select_symbol", "Please select a symbol."),
    }),
    fromExistingAssetId: z.string().nullable().optional(),
    fromQuantity: z.coerce
      .number({
        invalid_type_error: msg(
          t,
          "activity:form.err_quantity_number",
          "Quantity must be a number.",
        ),
      })
      .positive({
        message: msg(t, "activity:form.err_quantity_gt_zero", "Quantity must be greater than 0."),
      }),
    fromCurrency: z.string().min(1, {
      message: msg(t, "activity:form.err_currency_required", "Currency is required."),
    }),
    fromQuoteMode: z.enum([QuoteMode.MARKET, QuoteMode.MANUAL]).default(QuoteMode.MARKET),
    fromExchangeMic: z.string().nullable().optional(),
    fromSymbolQuoteCcy: z.string().nullable().optional(),
    fromSymbolInstrumentType: z.string().nullable().optional(),
    fromAssetMetadata: assetMetadataSchema,
    toAssetId: z.string().min(1, {
      message: msg(t, "activity:form.err_select_symbol", "Please select a symbol."),
    }),
    toExistingAssetId: z.string().nullable().optional(),
    toQuantity: z.coerce
      .number({
        invalid_type_error: msg(
          t,
          "activity:form.err_quantity_number",
          "Quantity must be a number.",
        ),
      })
      .positive({
        message: msg(t, "activity:form.err_quantity_gt_zero", "Quantity must be greater than 0."),
      }),
    toCurrency: z.string().min(1, {
      message: msg(t, "activity:form.err_currency_required", "Currency is required."),
    }),
    toQuoteMode: z.enum([QuoteMode.MARKET, QuoteMode.MANUAL]).default(QuoteMode.MARKET),
    toExchangeMic: z.string().nullable().optional(),
    toSymbolQuoteCcy: z.string().nullable().optional(),
    toSymbolInstrumentType: z.string().nullable().optional(),
    toAssetMetadata: assetMetadataSchema,
    fee: z.coerce
      .number({
        invalid_type_error: msg(t, "activity:form.err_fee_number", "Fee must be a number."),
      })
      .min(0, {
        message: msg(t, "activity:form.err_fee_non_negative", "Fee must be non-negative."),
      })
      .default(0),
    comment: z.string().optional().nullable(),
  });

// Zod schema for ExchangeForm validation (English messages; used by tests).
export const exchangeFormSchema = createExchangeFormSchema();

export type ExchangeFormValues = z.infer<typeof exchangeFormSchema>;

interface ExchangeFormProps {
  accounts: AccountSelectOption[];
  defaultValues?: Partial<ExchangeFormValues>;
  onSubmit: (data: ExchangeFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

export function ExchangeForm({
  accounts,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  isEditing = false,
}: ExchangeFormProps) {
  const { t } = useTranslation(["activity"]);
  const schema = useMemo(() => createExchangeFormSchema(t), [t]);

  const investmentAccountOptions = useMemo(
    () => accounts.filter((account) => !isLiabilityAccountType(account.accountType)),
    [accounts],
  );

  const initialAccount = accounts.find((a) => a.value === defaultValues?.accountId);

  const form = useForm<ExchangeFormValues>({
    resolver: zodResolver(schema) as Resolver<ExchangeFormValues>,
    mode: "onSubmit",
    defaultValues: {
      accountId: "",
      activityDate: new Date(),
      fromAssetId: "",
      fromExistingAssetId: null,
      fromQuantity: undefined,
      fromCurrency: initialAccount?.currency ?? "",
      fromQuoteMode: QuoteMode.MARKET,
      toAssetId: "",
      toExistingAssetId: null,
      toQuantity: undefined,
      toCurrency: initialAccount?.currency ?? "",
      toQuoteMode: QuoteMode.MARKET,
      fee: 0,
      comment: null,
      ...defaultValues,
    },
  });

  const { watch } = form;
  const accountId = watch("accountId");
  const fromQuoteMode = watch("fromQuoteMode");
  const toQuoteMode = watch("toQuoteMode");
  const selectedAccount = accounts.find((a) => a.value === accountId);

  const handleSubmit = createValidatedSubmit(form, async (data) => {
    if (!data.fromSymbolQuoteCcy && data.fromCurrency) {
      data.fromSymbolQuoteCcy = data.fromCurrency;
    }
    if (!data.toSymbolQuoteCcy && data.toCurrency) {
      data.toSymbolQuoteCcy = data.toCurrency;
    }
    await onSubmit(data);
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSection title={t("activity:form.section_exchange")}>
          <AccountSelect
            name="accountId"
            accounts={investmentAccountOptions}
            label={t("activity:field_account")}
            placeholder={t("activity:select_account_placeholder")}
          />
          <DatePicker name="activityDate" label={t("activity:field_date")} />
        </FormSection>

        <FormSection title={t("activity:form.section_exchange_closing")}>
          <SymbolSearch
            name="fromAssetId"
            isManualAsset={fromQuoteMode === QuoteMode.MANUAL}
            label={t("activity:form.label_symbol_closing")}
            exchangeMicName="fromExchangeMic"
            quoteModeName="fromQuoteMode"
            currencyName="fromCurrency"
            quoteCcyName="fromSymbolQuoteCcy"
            instrumentTypeName="fromSymbolInstrumentType"
            existingAssetIdName="fromExistingAssetId"
            assetMetadataName="fromAssetMetadata"
          />
          <input type="hidden" {...form.register("fromAssetMetadata.name")} />
          <input type="hidden" {...form.register("fromAssetMetadata.kind")} />
          <QuantityInput name="fromQuantity" label={t("activity:form.label_quantity")} />
        </FormSection>

        <FormSection title={t("activity:form.section_exchange_opening")}>
          <SymbolSearch
            name="toAssetId"
            isManualAsset={toQuoteMode === QuoteMode.MANUAL}
            label={t("activity:form.label_symbol_opening")}
            exchangeMicName="toExchangeMic"
            quoteModeName="toQuoteMode"
            currencyName="toCurrency"
            quoteCcyName="toSymbolQuoteCcy"
            instrumentTypeName="toSymbolInstrumentType"
            existingAssetIdName="toExistingAssetId"
            assetMetadataName="toAssetMetadata"
          />
          <input type="hidden" {...form.register("toAssetMetadata.name")} />
          <input type="hidden" {...form.register("toAssetMetadata.kind")} />
          <QuantityInput name="toQuantity" label={t("activity:form.label_quantity")} />
          <AmountInput
            name="fee"
            label={t("activity:form.label_fee")}
            currency={selectedAccount?.currency}
          />
        </FormSection>

        <FormSection title={t("activity:form.section_notes")}>
          <NotesInput
            name="comment"
            label={t("activity:form.label_notes")}
            placeholder={t("activity:form.placeholder_note")}
          />
        </FormSection>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t("activity:cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? (
              <Icons.Check className="mr-2 h-4 w-4" />
            ) : (
              <Icons.Plus className="mr-2 h-4 w-4" />
            )}
            {isEditing ? t("activity:form.button_update") : t("activity:form.button_add_exchange")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
