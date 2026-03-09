import type { BuiltinComponentRegistration } from "@/types/menu"

class ComponentRegistry {
  private registry: Map<string, BuiltinComponentRegistration> = new Map()

  register(registration: BuiltinComponentRegistration): void {
    this.registry.set(registration.name, registration)
    console.log(
      `[ComponentRegistry] Registered component: ${registration.name}`
    )
  }

  unregister(name: string): void {
    this.registry.delete(name)
    console.log(`[ComponentRegistry] Unregistered component: ${name}`)
  }

  get(name: string): BuiltinComponentRegistration | undefined {
    return this.registry.get(name)
  }

  getComponent(name: string): React.ComponentType<any> | undefined {
    return this.registry.get(name)?.component
  }

  has(name: string): boolean {
    return this.registry.has(name)
  }

  list(): BuiltinComponentRegistration[] {
    return Array.from(this.registry.values())
  }

  clear(): void {
    this.registry.clear()
    console.log("[ComponentRegistry] Cleared all registrations")
  }
}

export const componentRegistry = new ComponentRegistry()
