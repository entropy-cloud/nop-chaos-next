import type { AmisDictProvider, AmisPageProvider } from '@nop-chaos/amis-core'
import { isMockEnabled } from '../config/env'
import { fetchDictOptions } from '../services/dictApi'
import { fetchAmisPage } from '../services/pageApi'
import { testAmisSchema } from './testSchema'

export const mainAmisPageProvider: AmisPageProvider = {
  async getPage(schemaPath) {
    if (schemaPath === 'mock://preview') {
      return testAmisSchema
    }

    return fetchAmisPage(schemaPath)
  }
}

export const mainAmisDictProvider: AmisDictProvider = {
  async getDict(dictName, options) {
    if (isMockEnabled()) {
      return {
        status: 200,
        data: {
          status: 0,
          msg: '',
          data: [],
          dictName
        }
      }
    }

    const data = await fetchDictOptions(dictName, options.silent)

    return {
      status: 200,
      data: {
        status: 0,
        msg: '',
        data
      }
    }
  }
}
