import 'dart:io';

import 'package:csv/csv.dart';
import 'package:excel/excel.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../../../data/datasources/remote/supabase_service.dart';

/// Génère les exports de feedbacks (CSV et Excel) pour l'admin.
///
/// Les fichiers sont écrits dans le dossier documents de l'application et le
/// chemin est renvoyé pour être affiché / partagé.
class AdminExportService {
  AdminExportService(this._supabase);
  final SupabaseService _supabase;

  static const _headers = <String>[
    'id',
    'created_at',
    'sector_id',
    'establishment_id',
    'rating_normalized',
    'comment',
    'moderation_status',
    'priority',
    'anon_code',
  ];

  Future<List<List<dynamic>>> _rows() async {
    final feedbacks = await _supabase.fetchFeedbacks(limit: 1000);
    final rows = <List<dynamic>>[_headers];
    for (final f in feedbacks) {
      rows.add([
        f['id'],
        f['created_at'],
        f['sector_id'],
        f['establishment_id'],
        f['rating_normalized'],
        (f['comment'] as String?)?.replaceAll('\n', ' '),
        f['moderation_status'],
        f['priority'],
        f['anon_code'],
      ]);
    }
    return rows;
  }

  /// Export CSV. Retourne le fichier écrit.
  Future<File> exportCsv() async {
    final rows = await _rows();
    final content = Csv().encode(rows);
    return _writeString('feedbacks_export.csv', content);
  }

  /// Export Excel (.xlsx). Retourne le fichier écrit.
  Future<File> exportExcel() async {
    final rows = await _rows();
    final excel = Excel.createExcel();
    final sheet = excel['Feedbacks'];
    excel.delete('Sheet1');
    for (final row in rows) {
      sheet.appendRow(
        row.map<CellValue?>((v) => TextCellValue(v?.toString() ?? '')).toList(),
      );
    }
    final bytes = excel.encode() ?? <int>[];
    return _writeBytes('feedbacks_export.xlsx', bytes);
  }

  Future<File> _writeString(String name, String content) async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$name');
    return file.writeAsString(content);
  }

  Future<File> _writeBytes(String name, List<int> bytes) async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$name');
    return file.writeAsBytes(bytes);
  }
}

final adminExportServiceProvider = Provider<AdminExportService>(
  (ref) => AdminExportService(ref.read(supabaseServiceProvider)),
);
