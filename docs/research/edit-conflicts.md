# Конфликты параллельного редактирования

Проверено 7 ноября 2026 года при исправлении форм 2CRM.

## Что найдено в эталонах

- OpenProject передаёт lockVersion и отклоняет запись по устаревшей версии. Его компонент конфликта показывает предупреждение с действием обновления страницы. UI-тест оставляет редактор открытым при обнаружении чужой правки и проверяет отказ сервера при сохранении устаревшей версии. Это подтверждает предупреждение и явное обновление, но не является готовым сравнением двух полных форм. [API](https://www.openproject.org/docs/api/example/), [компонент](https://github.com/opf/openproject/blob/2d844130f5c9dd336114cf4efee4a8e4818fc793/app/components/work_packages/update_conflict_component.rb), [UI-тест](https://github.com/opf/openproject/blob/2d844130f5c9dd336114cf4efee4a8e4818fc793/spec/features/activities/work_package/activities_spec.rb).
- В исследованном снимке Atomic CRM запись делегирована Supabase data provider. Обработчик смены статуса контакта использует optimistic mutation и уведомление onError. На основании этих просмотренных участков нельзя приписать всей CRM отдельный механизм разрешения конфликта версий. [Provider](https://github.com/marmelab/atomic-crm/blob/main/src/components/atomic-crm/providers/supabase/dataProvider.ts), [обработчик статуса](https://github.com/marmelab/atomic-crm/blob/main/src/components/atomic-crm/contacts/ContactInputs.tsx).
- Twenty в useUpdateOneRecord сначала обновляет локальный Apollo cache и выполняет мутацию. Этот механизм отвечает за быстрый отклик экрана; он сам по себе не подтверждает сценарий сравнения конкурентных правок пользователем. [Просмотренный обработчик](https://github.com/twentyhq/twenty/blob/d9f35d4864a2f15f6a3a22b10f06bdbda9ac4966/packages/twenty-front/src/modules/object-record/hooks/useUpdateOneRecord.ts).

## Принято для 2CRM

Пользователь согласовал компактный блок внутри модальной формы. Черновик сохраняется, показываются только отличающиеся поля, затем выбирается загрузка актуальных данных или явное сохранение своего варианта. Это адаптация для наших коротких форм, а не заявление о копировании поведения конкретной CRM.

Каждая попытка записи сохраняет серверную проверку версии. Если после показа блока произошла ещё одна правка, требуется новый выбор. Блокировки записи на всё время редактирования, realtime и самостоятельный редактор слияния не добавлялись.
