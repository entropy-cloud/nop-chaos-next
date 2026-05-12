import type { AmisDictProvider, AmisPageProvider } from '@nop-chaos/amis-core';
import { isMockEnabled } from '../config/env';
import { fetchDictOptions } from '../services/dict-api';
import { fetchAmisPage } from '../services/page-api';

async function getPreviewSchema() {
  const module = await import('./test-schema');
  return module.testAmisSchema;
}

export const mainAmisPageProvider: AmisPageProvider = {
  async getPage(schemaPath) {
    if (schemaPath === 'mock://preview') {
      return getPreviewSchema();
    }

    return fetchAmisPage(schemaPath);
  },
};

export const mainAmisDictProvider: AmisDictProvider = {
  async getDict(dictName, options) {
    if (isMockEnabled()) {
      return {
        status: 200,
        data: {
          status: 0,
          msg: '',
          data: [],
          dictName,
        },
      };
    }

    const data = await fetchDictOptions(dictName, options.silent);

    return {
      status: 200,
      data: {
        status: 0,
        msg: '',
        data,
      },
    };
  },
};
