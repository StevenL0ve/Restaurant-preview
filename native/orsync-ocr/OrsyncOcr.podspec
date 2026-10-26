require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'OrsyncOcr'
  s.version = package['version']
  s.summary = package['description']
  s.license = 'Proprietary'
  s.homepage = 'https://github.com/StevenL0ve/Restaurant-preview'
  s.author = package['author']
  s.source = { :git => 'https://github.com/StevenL0ve/Restaurant-preview.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '13.0'
  s.dependency 'Capacitor'
  s.frameworks = 'Vision', 'VisionKit'
  s.swift_version = '5.1'
end
