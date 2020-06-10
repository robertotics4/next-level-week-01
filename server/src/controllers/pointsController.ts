import { Request, Response, RequestParamHandler } from 'express';
import knex from '../database/connection';

class PointsController {
    async index(request: Request, response: Response) {
        const { city, uf, items } = request.query;

        const parsedItems = String(items)
            .split(',')
            .map(item => Number(item.trim()));

        const points = await knex('points')
            .join('point_items', 'points.id', '=', 'point_items.point_id')
            .whereIn('point_items.item_id', parsedItems)
            .where('city', String(city))
            .where('uf', String(uf))
            .distinct()
            .select('points.*');

        return response.status(200).json(points);
    }

    async show(request: Request, response: Response) {
        const { id } = request.params;

        const point = await knex('points').where('id', id).first();

        if (!point)
            return response.status(400).json({ message: 'Point not found' });

        const items = await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title')

        response.status(200).json({ point, items });
    }

    async create(request: Request, response: Response) {
        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = request.body;

        const trx = await knex.transaction();
        const point = {
            image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=400&q=60',
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf
        };

        const insertedIds = await knex('points').transacting(trx)
            .insert(point)
            .catch(await trx.rollback);

        const point_id = insertedIds[0];

        const point_items = items.map((item_id: number) => {
            return {
                item_id,
                point_id
            };
        });

        await knex('point_items').transacting(trx)
            .insert(point_items)
            .then(await trx.commit)
            .catch(await trx.rollback);

        return response.json({
            id: point_id,
            ...point
        });
    }
}

export default PointsController;