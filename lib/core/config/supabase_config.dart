/// Centralised Supabase configuration.
///
/// Remplace [url] et [anonKey] par les valeurs de ton projet Supabase
/// (Dashboard Supabase > Project Settings > API).
///
/// ⚠️ SOURCE UNIQUE DE VÉRITÉ : ces valeurs doivent être IDENTIQUES à celles du
/// dashboard admin web (web_admin/.env.local). Le mobile et le web doivent
/// pointer sur le MÊME projet Supabase, sinon les feedbacks envoyés depuis le
/// mobile n'apparaissent jamais côté admin.
///
/// Astuce sécurité : tu peux passer ces valeurs via --dart-define pour ne pas
/// les committer en clair, par ex :
///   flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
class SupabaseConfig {
  SupabaseConfig._();

  // ⚠️ 1ᵉʳ argument = NOM de la variable --dart-define (PAS la valeur).
  // La valeur réelle se met dans defaultValue (ou via --dart-define).
  // L'URL doit être l'URL de base du projet, SANS « /rest/v1/ ».
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://bwkqzmdodbewhbrvkzpv.supabase.co',
  );

  // Clé anon (publishable) du projet bwkqzmdodbewhbrvkzpv.
  // Doit être IDENTIQUE à web_admin/.env.local.
  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'sb_publishable_RjSOroIOkYmP_SF6q_7-1g_pQI0MBW_',
  );

  /// Nom du bucket Storage pour les photos de feedback (compressées).
  static const String feedbackPhotosBucket = 'feedback-photos';

  /// Bucket pour les photos avant/après des améliorations.
  static const String improvementPhotosBucket = 'improvement-photos';
}
