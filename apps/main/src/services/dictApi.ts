import { isMockEnabled } from '../config/env'
import { ajaxQuery } from './http'

export async function fetchDictOptions(dictName: string, silent?: boolean) {
  if (isMockEnabled()) {
    return [] as unknown[]
  }

  return ajaxQuery<unknown>('@query:DictProvider__getDict/static,options{value,label}', {
    dictName
  }, {
    silent
  })
}
