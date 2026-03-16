import type { AmisDictProvider, AmisPageProvider } from '@nop-chaos/amis-core'
import { testAmisSchema } from './testSchema'

export const mainAmisPageProvider: AmisPageProvider = {
  async getPage(schemaPath) {
    if (schemaPath === 'mock://preview') {
      return testAmisSchema
    }

    const response = await fetch(schemaPath, {
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to load amis schema: ${response.status}`)
    }

    return response.json()
  }
}

export const mainAmisDictProvider: AmisDictProvider = {
  async getDict(dictName) {
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
}
