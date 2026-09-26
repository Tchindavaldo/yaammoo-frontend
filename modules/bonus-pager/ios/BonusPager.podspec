Pod::Spec.new do |s|
  s.name           = 'BonusPager'
  s.version        = '1.0.0'
  s.summary        = 'Carrousel natif de la sheet Bonus yaammoo'
  s.description    = 'UIScrollView pagine (cartes React) et pied de page UIKit synchronise au scroll.'
  s.author         = 'yaammoo'
  s.homepage       = 'https://yaammoo.com'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
end
