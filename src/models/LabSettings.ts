import mongoose, { Schema, Document, Model } from 'mongoose';
import { ILabSettings, DEFAULT_LAB_SETTINGS } from '@/types';

export interface ILabSettingsDoc extends Omit<ILabSettings, '_id'>, Document {}

const LabSettingsSchema = new Schema<ILabSettingsDoc>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    labName: { type: String, required: true, trim: true, default: DEFAULT_LAB_SETTINGS.labName },
    tagline: { type: String, default: DEFAULT_LAB_SETTINGS.tagline, trim: true },
    logoUrl: { type: String, default: '', trim: true },
    registrationNumber: { type: String, default: DEFAULT_LAB_SETTINGS.registrationNumber, trim: true },
    accreditation: { type: String, default: DEFAULT_LAB_SETTINGS.accreditation, trim: true },

    primaryPhone: { type: String, default: DEFAULT_LAB_SETTINGS.primaryPhone, trim: true },
    secondaryPhone: { type: String, default: DEFAULT_LAB_SETTINGS.secondaryPhone, trim: true },
    email: { type: String, default: DEFAULT_LAB_SETTINGS.email, trim: true },
    website: { type: String, default: DEFAULT_LAB_SETTINGS.website, trim: true },
    whatsapp: { type: String, default: DEFAULT_LAB_SETTINGS.whatsapp, trim: true },

    addressLine1: { type: String, default: DEFAULT_LAB_SETTINGS.addressLine1, trim: true },
    addressLine2: { type: String, default: DEFAULT_LAB_SETTINGS.addressLine2, trim: true },
    city: { type: String, default: DEFAULT_LAB_SETTINGS.city, trim: true },
    state: { type: String, default: DEFAULT_LAB_SETTINGS.state, trim: true },
    postalCode: { type: String, default: DEFAULT_LAB_SETTINGS.postalCode, trim: true },
    country: { type: String, default: DEFAULT_LAB_SETTINGS.country, trim: true },

    reportHeader: { type: String, default: DEFAULT_LAB_SETTINGS.reportHeader, trim: true },
    reportFooter: { type: String, default: DEFAULT_LAB_SETTINGS.reportFooter, trim: true },
    receiptFooter: { type: String, default: DEFAULT_LAB_SETTINGS.receiptFooter, trim: true },
    signatoryName: { type: String, default: DEFAULT_LAB_SETTINGS.signatoryName, trim: true },
    signatoryDesignation: { type: String, default: DEFAULT_LAB_SETTINGS.signatoryDesignation, trim: true },
    currency: { type: String, default: DEFAULT_LAB_SETTINGS.currency, trim: true },
    timezone: { type: String, default: DEFAULT_LAB_SETTINGS.timezone, trim: true },
  },
  { timestamps: true }
);

export const LabSettings: Model<ILabSettingsDoc> =
  mongoose.models.LabSettings || mongoose.model<ILabSettingsDoc>('LabSettings', LabSettingsSchema);
