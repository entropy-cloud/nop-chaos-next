import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AmisPageRoute } from '@nop-chaos/amis-react'
import { createMainAmisAdapter } from './adapter'
import { mainAmisDictProvider, mainAmisPageProvider } from './providers'

interface AmisRouteRendererProps {
  schemaPath: string
  title: string
}

export function AmisRouteRenderer({ schemaPath, title }: AmisRouteRendererProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const adapter = useMemo(() => createMainAmisAdapter({
    currentPath: location.pathname,
    navigate,
    pageProvider: mainAmisPageProvider,
    dictProvider: mainAmisDictProvider
  }), [location.pathname, navigate])

  return <AmisPageRoute key={schemaPath} adapter={adapter} schemaPath={schemaPath} title={title} />
}
