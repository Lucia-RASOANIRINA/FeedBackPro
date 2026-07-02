import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/sectors.dart';
import '../../core/error/error_handler.dart';
import '../../core/localization/app_strings.dart';
import '../../data/datasources/remote/supabase_service.dart';
import 'providers/admin_provider.dart';
import 'services/admin_export_service.dart';
import 'widgets/stat_card.dart';

/// Tableau de bord administrateur (recommandé en Flutter Web).
/// Affiche KPIs, répartition par secteur, avis récents et export.
class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppStrings.of(context);
    final statsAsync = ref.watch(dashboardStatsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(t.t('admin_dashboard')),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.download),
            tooltip: t.t('export_csv'),
            onSelected: (fmt) => _export(context, ref, fmt),
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'csv', child: Text('Export CSV')),
              PopupMenuItem(value: 'xlsx', child: Text('Export Excel (.xlsx)')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.map_outlined),
            tooltip: 'Carte de chaleur',
            onPressed: () => context.push('/heatmap'),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(dashboardStatsProvider),
          ),
        ],
      ),
      body: statsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (stats) => _DashboardBody(stats: stats),
      ),
    );
  }

  Future<void> _export(BuildContext context, WidgetRef ref, String fmt) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(content: Text('Export ${fmt.toUpperCase()} en cours…')),
    );
    try {
      final service = ref.read(adminExportServiceProvider);
      final file = fmt == 'xlsx'
          ? await service.exportExcel()
          : await service.exportCsv();
      messenger.showSnackBar(
        SnackBar(content: Text('Export enregistré : ${file.path}')),
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('Export impossible : ${ErrorHandler.humanize(e)}')),
      );
    }
  }
}

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.stats});
  final DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    final t = AppStrings.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        // Responsive : 4 colonnes sur web large, 2 sur mobile.
        final cols = constraints.maxWidth > 900 ? 4 : 2;
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            GridView.count(
              crossAxisCount: cols,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.6,
              children: [
                StatCard(
                  label: t.t('total_feedbacks'),
                  value: '${stats.total}',
                  icon: Icons.forum_outlined,
                  color: Colors.blue,
                ),
                StatCard(
                  label: t.t('average_rating'),
                  value: '${(stats.averageRating / 20).toStringAsFixed(1)}/5',
                  icon: Icons.star_outline,
                  color: Colors.amber,
                ),
                StatCard(
                  label: t.t('pending_moderation'),
                  value: '${stats.pendingModeration}',
                  icon: Icons.pending_actions,
                  color: Colors.orange,
                ),
                StatCard(
                  label: t.t('resolved'),
                  value: '${stats.resolved}',
                  icon: Icons.check_circle_outline,
                  color: Colors.green,
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Répartition par secteur.
            Text('Feedbacks / ${t.t('categories')}',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  height: 220,
                  child: stats.bySector.isEmpty
                      ? const Center(child: Text('—'))
                      : _SectorBarChart(bySector: stats.bySector),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Avis récents.
            Text(t.t('recent_feedbacks'),
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            if (stats.recent.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: Text('—')),
                ),
              )
            else
              ...stats.recent.map((r) => _FeedbackTile(row: r)),
          ],
        );
      },
    );
  }
}

class _SectorBarChart extends StatelessWidget {
  const _SectorBarChart({required this.bySector});
  final Map<String, int> bySector;

  @override
  Widget build(BuildContext context) {
    final entries = bySector.entries.toList();
    final maxY = entries
        .map((e) => e.value)
        .fold<int>(0, (a, b) => a > b ? a : b)
        .toDouble();

    return BarChart(
      BarChartData(
        maxY: maxY + 1,
        barGroups: [
          for (var i = 0; i < entries.length; i++)
            BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: entries[i].value.toDouble(),
                  width: 22,
                  borderRadius: BorderRadius.circular(4),
                  color: Sectors.byId(entries[i].key)?.color ?? Colors.grey,
                ),
              ],
            ),
        ],
        titlesData: FlTitlesData(
          leftTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles:
              const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final i = value.toInt();
                if (i < 0 || i >= entries.length) return const SizedBox();
                final sector = Sectors.byId(entries[i].key);
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Icon(sector?.icon ?? Icons.help_outline, size: 18),
                );
              },
            ),
          ),
        ),
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
      ),
    );
  }
}

class _FeedbackTile extends ConsumerWidget {
  const _FeedbackTile({required this.row});
  final Map<String, dynamic> row;

  Future<void> _moderate(
      BuildContext context, WidgetRef ref, String action) async {
    final id = row['id']?.toString();
    if (id == null) return;
    // Valeurs conformes à la contrainte CHECK de moderation_status
    // ('new','validated','hidden','resolved') et à l'enum feedback_status.
    final fields = switch (action) {
      'validate' => {'moderation_status': 'validated'},
      'hide' => {'moderation_status': 'hidden'},
      'resolve' => {'moderation_status': 'resolved', 'status': 'resolved'},
      _ => <String, dynamic>{},
    };
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(supabaseServiceProvider).updateFeedbackFields(id, fields);
      ref.invalidate(dashboardStatsProvider);
      messenger.showSnackBar(
        const SnackBar(content: Text('Feedback mis à jour.')),
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text('Action impossible : ${ErrorHandler.humanize(e)}')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rating = (row['rating_normalized'] as num?)?.toDouble() ?? 0;
    final sector = Sectors.byId(row['sector_id'] as String? ?? '');
    final comment = row['comment'] as String? ?? '';
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: (sector?.color ?? Colors.grey).withValues(alpha: 0.15),
          child: Icon(sector?.icon ?? Icons.help_outline,
              color: sector?.color),
        ),
        title: Text(
          comment.isEmpty ? '(sans commentaire)' : comment,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text('${(rating / 20).toStringAsFixed(1)}/5'),
        trailing: PopupMenuButton<String>(
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'validate', child: Text('Valider')),
            PopupMenuItem(value: 'hide', child: Text('Masquer')),
            PopupMenuItem(value: 'resolve', child: Text('Marquer traité')),
          ],
          onSelected: (action) => _moderate(context, ref, action),
        ),
      ),
    );
  }
}
