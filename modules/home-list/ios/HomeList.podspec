Pod::Spec.new do |s|
  s.name           = 'HomeList'
  s.version        = '1.0.0'
  s.summary        = 'Liste native (UICollectionView) du home yaammoo'
  s.description    = 'Rangees boutiques, cartes menu, banniere et squelettes rendus en UIKit.'
  s.author         = 'yaammoo'
  s.homepage       = 'https://yaammoo.com'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  # Deja embarque par expo-image : meme cache memoire/disque que le reste de l'app.
  s.dependency 'SDWebImage'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,swift}'
end
