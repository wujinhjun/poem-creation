import {
  createUserExportTemplate,
  isUserExportTemplate,
  readLegacyUserExportTemplates,
  type UserExportTemplate,
} from "../utils/exportTemplates";
import {
  EXPORT_TEMPLATE_STORE_NAME,
  runDbTransactionComplete,
  runDbTransaction,
} from "./indexedDb";

export interface ExportTemplateStore {
  listTemplates(): Promise<UserExportTemplate[]>;
  saveTemplates(templates: UserExportTemplate[]): Promise<void>;
}

export class IndexedDbExportTemplateStore implements ExportTemplateStore {
  private legacyMigrationComplete = false;

  async listTemplates(): Promise<UserExportTemplate[]> {
    if (!("indexedDB" in window)) return readLegacyUserExportTemplates();

    const templates = await runDbTransaction<UserExportTemplate[]>(
      EXPORT_TEMPLATE_STORE_NAME,
      "readonly",
      (store) => store.getAll(),
    );
    const validTemplates = templates.filter(isUserExportTemplate);

    if (validTemplates.length > 0) return validTemplates;
    if (!this.legacyMigrationComplete) {
      this.legacyMigrationComplete = true;
      const legacyTemplates = readLegacyUserExportTemplates();
      if (legacyTemplates.length > 0) {
        await this.saveTemplates(legacyTemplates);
        return legacyTemplates;
      }
    }

    const defaultTemplate = createUserExportTemplate("modern-whitespace");
    await this.saveTemplates([defaultTemplate]);
    return [defaultTemplate];
  }

  async saveTemplates(templates: UserExportTemplate[]): Promise<void> {
    if (!("indexedDB" in window)) return;
    await runDbTransactionComplete(
      EXPORT_TEMPLATE_STORE_NAME,
      "readwrite",
      (store) => {
        store.clear();
        templates.forEach((template) => store.put(template, template.id));
      },
    );
  }
}

export function createExportTemplateStore(): ExportTemplateStore {
  return new IndexedDbExportTemplateStore();
}
