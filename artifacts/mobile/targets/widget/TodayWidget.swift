import SwiftUI
import WidgetKit

// MARK: - Timeline

struct TodayEntry: TimelineEntry {
  let date: Date
  let current: WidgetTask?
  let upcoming: [WidgetTask]
}

struct TodayProvider: TimelineProvider {
  func placeholder(in context: Context) -> TodayEntry {
    let now = Date()
    let sample = WidgetTask(
      id: "p", title: "Focus block", start: now.timeIntervalSince1970 - 600,
      end: now.timeIntervalSince1970 + 1500, tone: "#E9E2FF", ink: "#6C5CE7",
      icon: "briefcase.fill", done: false)
    return TodayEntry(date: now, current: sample, upcoming: [])
  }

  func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
    completion(entry(at: Date(), tasks: loadPayload()?.tasks ?? []) ?? placeholder(in: context))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
    let tasks = (loadPayload()?.tasks ?? []).filter { !$0.done }.sorted { $0.start < $1.start }
    let now = Date()
    // An entry now + one at every start/end boundary, so the widget advances on its own.
    var dates: [Date] = [now]
    for t in tasks where t.endDate > now {
      if t.startDate > now { dates.append(t.startDate) }
      dates.append(t.endDate)
    }
    let entries = Array(Set(dates)).sorted().prefix(40).compactMap { entry(at: $0, tasks: tasks) }
    let refresh = Calendar.current.date(byAdding: .hour, value: 1, to: now)!
    completion(Timeline(entries: entries.isEmpty ? [TodayEntry(date: now, current: nil, upcoming: [])] : entries,
                        policy: .after(refresh)))
  }

  private func entry(at date: Date, tasks: [WidgetTask]) -> TodayEntry? {
    let open = tasks.filter { !$0.done }
    let current = open.first { $0.startDate <= date && $0.endDate > date }
    let upcoming = open.filter { $0.startDate > date }.prefix(3)
    return TodayEntry(date: date, current: current, upcoming: Array(upcoming))
  }
}

// MARK: - Views

struct TaskIcon: View {
  let task: WidgetTask
  var size: CGFloat = 30
  var body: some View {
    Image(systemName: task.icon)
      .font(.system(size: size * 0.48, weight: .semibold))
      .foregroundStyle(Color(hex: task.ink))
      .frame(width: size, height: size)
      .background(Color.white, in: RoundedRectangle(cornerRadius: size * 0.36, style: .continuous))
  }
}

struct NowBlock: View {
  let task: WidgetTask
  let isNow: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 8) {
        TaskIcon(task: task)
        Text(isNow ? "NOW" : "NEXT")
          .font(.system(size: 11, weight: .heavy))
          .foregroundStyle(Color(hex: task.ink))
        Spacer(minLength: 0)
      }
      Text(task.title)
        .font(.system(size: 15, weight: .bold, design: .rounded))
        .foregroundStyle(brandInk)
        .lineLimit(2)
      if isNow {
        ProgressView(timerInterval: task.startDate...task.endDate, countsDown: true) {
          EmptyView()
        } currentValueLabel: {
          EmptyView()
        }
        .tint(Color(hex: task.ink))
        Text(timerInterval: task.startDate...task.endDate, countsDown: true)
          .font(.system(size: 12, weight: .semibold).monospacedDigit())
          .foregroundStyle(brandMuted)
      } else {
        Text("at \(timeLabel(task.startDate))")
          .font(.system(size: 12, weight: .semibold))
          .foregroundStyle(brandMuted)
      }
    }
  }
}

struct EmptyBlock: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Image(systemName: "checkmark.circle.fill")
        .font(.system(size: 24))
        .foregroundStyle(Color(hex: "#1E9E62"))
      Text("All clear")
        .font(.system(size: 15, weight: .bold, design: .rounded))
        .foregroundStyle(brandInk)
      Text("Nothing else planned.")
        .font(.system(size: 12))
        .foregroundStyle(brandMuted)
    }
  }
}

struct TodayWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: TodayEntry

  var primary: WidgetTask? { entry.current ?? entry.upcoming.first }
  var rest: [WidgetTask] { entry.current == nil ? Array(entry.upcoming.dropFirst()) : entry.upcoming }

  var body: some View {
    switch family {
    case .accessoryRectangular:
      if let t = primary {
        VStack(alignment: .leading, spacing: 2) {
          Label(t.title, systemImage: t.icon).font(.headline).lineLimit(1)
          if entry.current != nil {
            Text(timerInterval: t.startDate...t.endDate, countsDown: true).font(.caption).monospacedDigit()
          } else {
            Text("Next · \(timeLabel(t.startDate))").font(.caption)
          }
        }
      } else {
        Label("All clear", systemImage: "checkmark.circle")
      }
    case .accessoryCircular:
      if let t = entry.current {
        ProgressView(timerInterval: t.startDate...t.endDate, countsDown: true) {
          Image(systemName: t.icon)
        }
        .progressViewStyle(.circular)
      } else {
        Image(systemName: primary?.icon ?? "checkmark")
      }
    case .accessoryInline:
      if let t = primary {
        Text(entry.current != nil ? "Now: \(t.title)" : "Next: \(t.title) \(timeLabel(t.startDate))")
      } else {
        Text("All clear")
      }
    case .systemMedium:
      HStack(alignment: .top, spacing: 14) {
        Group {
          if let t = primary { NowBlock(task: t, isNow: entry.current != nil) } else { EmptyBlock() }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        VStack(alignment: .leading, spacing: 8) {
          HStack {
            Text("LATER")
              .font(.system(size: 11, weight: .heavy))
              .foregroundStyle(brandMuted)
            Spacer(minLength: 0)
            // Quick capture straight from the home screen.
            Link(destination: URL(string: "dayflow://capture")!) {
              Image(systemName: "plus")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color.white)
                .frame(width: 26, height: 26)
                .background(brandPrimary, in: Circle())
            }
            .accessibilityLabel("Quick add to Inbox")
          }
          ForEach(rest.prefix(3), id: \.id) { t in
            HStack(spacing: 8) {
              TaskIcon(task: t, size: 22)
              VStack(alignment: .leading, spacing: 0) {
                Text(t.title).font(.system(size: 12, weight: .semibold)).foregroundStyle(brandInk).lineLimit(1)
                Text(timeLabel(t.startDate)).font(.system(size: 10)).foregroundStyle(brandMuted)
              }
            }
          }
          if rest.isEmpty {
            Text("Nothing more today").font(.system(size: 12)).foregroundStyle(brandMuted)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    default:
      if let t = primary { NowBlock(task: t, isNow: entry.current != nil) } else { EmptyBlock() }
    }
  }
}

struct TodayWidget: Widget {
  let kind = "DayflowToday"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
      TodayWidgetView(entry: entry)
        .containerBackground(for: .widget) {
          if let t = entry.current ?? entry.upcoming.first {
            Color(hex: t.tone)
          } else {
            Color(hex: "#FBFAFF")
          }
        }
        .widgetURL(URL(string: "dayflow://"))
    }
    .configurationDisplayName("Now & next")
    .description("See what to do now and how much time is left.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
  }
}
