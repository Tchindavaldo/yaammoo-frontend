import ExpoModulesCore

/**
 Module Expo du carrousel natif de la sheet Bonus. Cote JS :
 `modules/bonus-pager/index.ts` → `NativeBonusPager.tsx` (feature bonus).
 */
public final class BonusPagerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BonusPager")

    View(BonusPagerView.self) {
      Prop("items") { (view: BonusPagerView, items: [BPItemRecord]) in
        view.items = items.map(BPItem.init)
      }

      Prop("footerHeight") { (view: BonusPagerView, height: Double) in
        view.footerHeight = CGFloat(height)
      }

      Prop("textColor") { (view: BonusPagerView, color: String) in
        view.textColor = BPColor.parse(color) ?? .black
      }

      Prop("iconFontFamily") { (view: BonusPagerView, family: String?) in
        view.iconFontFamily = family
      }

      OnViewDidUpdateProps { (view: BonusPagerView) in
        view.applyProps()
      }
    }
  }
}
