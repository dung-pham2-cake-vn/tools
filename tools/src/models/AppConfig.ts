import mongoose, { Document, Schema } from 'mongoose';

export interface IAppConfig extends Document {
  key: string;
  value: any;
}

const AppConfigSchema = new Schema<IAppConfig>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed },
});

export const AppConfig = mongoose.model<IAppConfig>('AppConfig', AppConfigSchema);

export const getConfig = async (key: string): Promise<any> => {
  const doc = await AppConfig.findOne({ key }).lean();
  return doc?.value ?? null;
};

export const setConfig = async (key: string, value: any): Promise<void> => {
  await AppConfig.findOneAndUpdate({ key }, { value }, { upsert: true });
};
